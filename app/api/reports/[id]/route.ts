import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface UpdateReportBody {
  content?: unknown
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: report, error } = await admin
      .from('study_reports')
      .select('id, study_id, agent_id, content, status, pdf_path, created_at, validated_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as UpdateReportBody

    console.log('[PATCH report] id:', id)
    console.log('[PATCH report] content reçu:', JSON.stringify(body.content))

    if (body.content === undefined) {
      return NextResponse.json({ error: 'content requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('[PATCH report] auth error:', authError?.message)
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    console.log('[PATCH report] user.id:', user.id)

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      console.log('[PATCH report] profile error ou accès refusé:', profileError?.message, profile?.role)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { data: updated, error: updateError } = await admin
      .from('study_reports')
      .update({
        content: body.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, study_id, agent_id, content, status, pdf_path, created_at, validated_at, updated_at')
      .single()

    console.log('[PATCH report] résultat DB data:', JSON.stringify(updated?.content))
    console.log('[PATCH report] résultat DB error:', updateError?.message)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ report: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
