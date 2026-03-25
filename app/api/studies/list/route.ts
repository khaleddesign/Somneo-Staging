import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'
import { parsePaginationParams } from '@/lib/studies/paginationParams'
import { paginateResults } from '@/lib/studies/paginateResults'
import { parseScopeParam, buildClientScopeFilter } from '@/lib/studies/scopeFilter'
import { computeDelayDays, isStale } from '@/lib/studies/studyMetrics'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ── Pagination params ──────────────────────────────────────────────────
    const searchParams = new URL(req.url).searchParams
    const { limit, cursor } = parsePaginationParams(searchParams)

    // ── DB query with cursor-based pagination ──────────────────────────────
    // Fetch limit+1 to detect if there's a next page (no COUNT(*) needed)
    let rawStudies: Record<string, unknown>[]

    if (profile.role === 'client') {
      // Clients see all studies (same as agents)
      const admin = createAdminClient()
      let query = admin
        .from('studies')
        .select('*, profiles!studies_client_id_fkey(full_name, email)')
        .order('submitted_at', { ascending: false })
        .limit(limit + 1)

      if (cursor) {
        query = query.lt('submitted_at', cursor)
      }

      const { data, error } = await query
      if (error) throw error
      rawStudies = (data ?? []) as unknown as Record<string, unknown>[]
    } else {
      // agent/admin: bypass RLS to see all studies
      const admin = createAdminClient()
      let query = admin
        .from('studies')
        .select('*, profiles!studies_client_id_fkey(full_name, email)')
        .order('submitted_at', { ascending: false })
        .limit(limit + 1)

      if (cursor) {
        query = query.lt('submitted_at', cursor)
      }

      const { data, error } = await query
      if (error) throw error
      rawStudies = (data ?? []) as Record<string, unknown>[]

      // ── Cursor pagination: detect next page ──────────────────────────────
      const { items: agentPageStudies, nextCursor: agentNextCursor } = paginateResults(rawStudies, limit, 'submitted_at')

      // ── Enrich agent/admin studies with result_date, delay_days, is_stale ─
      const pageIds = agentPageStudies.map(s => s.id as string)
      let enrichedForDecrypt = agentPageStudies as Record<string, unknown>[]

      if (pageIds.length > 0) {
        const { data: reports } = await admin
          .from('study_reports')
          .select('study_id, created_at')
          .in('study_id', pageIds)
          .order('created_at', { ascending: false })

        const reportMap = new Map<string, string>()
        for (const r of reports ?? []) {
          if (!reportMap.has(r.study_id as string)) {
            reportMap.set(r.study_id as string, r.created_at as string)
          }
        }

        enrichedForDecrypt = agentPageStudies.map(s => {
          const resultDate = reportMap.get(s.id as string) ?? null
          return {
            ...s,
            result_date: resultDate,
            delay_days: computeDelayDays(s.submitted_at as string, resultDate),
            is_stale: isStale(
              (s.updated_at ?? s.submitted_at) as string,
              s.status as string
            ),
          }
        })
      }

      // ── Decrypt patient_reference in parallel ───────────────────────────
      const studies = await Promise.all(
        enrichedForDecrypt.map(async (study) => ({
          ...study,
          patient_reference: study.patient_reference
            ? decrypt(study.patient_reference as string)
            : null,
        }))
      )

      return NextResponse.json({ studies, nextCursor: agentNextCursor })
    }

    // ── Client path: cursor pagination + decrypt ───────────────────────────
    const { items: pageStudies, nextCursor } = paginateResults(rawStudies, limit, 'submitted_at')

    // ── Decrypt patient_reference in parallel (was sequential .map) ────────
    const studies = await Promise.all(
      pageStudies.map(async (study) => ({
        ...study,
        patient_reference: study.patient_reference
          ? decrypt(study.patient_reference as string)
          : null,
      }))
    )

    return NextResponse.json({ studies, nextCursor })
  } catch (err) {
    console.error('[GET /api/studies/list]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
