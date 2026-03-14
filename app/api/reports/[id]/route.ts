import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

interface UpdateReportBody {
  content?: unknown
}

/**
 * Verify caller has access to a report via its associated study.
 * Returns the report if accessible, or a NextResponse error.
 */
async function getReportWithAccess(
  reportId: string,
  userId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<
  | { report: Record<string, unknown>; error: null }
  | { report: null; error: NextResponse }
> {
  const [
    { data: report, error: reportError },
    { data: callerProfile, error: profileError },
  ] = await Promise.all([
    admin
      .from('study_reports')
      .select('id, study_id, agent_id, content, status, pdf_path, created_at, validated_at, updated_at')
      .eq('id', reportId)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('role, institution_id')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (reportError || profileError) {
    return { report: null, error: NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
  }
  if (!report) {
    return { report: null, error: NextResponse.json({ error: 'Report not found' }, { status: 404 }) }
  }
  if (!callerProfile) {
    return { report: null, error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  const { data: study, error: studyError } = await admin
    .from('studies')
    .select('client_id, assigned_agent_id, client:profiles!studies_client_id_fkey(institution_id)')
    .eq('id', report.study_id)
    .maybeSingle()

  if (studyError || !study) {
    return { report: null, error: NextResponse.json({ error: 'Associated study not found' }, { status: 404 }) }
  }

  const institution = (study.client as unknown as { institution_id: string } | null)?.institution_id
  const hasAccess =
    (callerProfile.role === 'admin' && institution === callerProfile.institution_id) ||
    (callerProfile.role === 'agent' && study.assigned_agent_id === userId) ||
    (callerProfile.role === 'client' && study.client_id === userId)

  if (!hasAccess) {
    return { report: null, error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) }
  }

  return { report: report as Record<string, unknown>, error: null }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { report, error } = await getReportWithAccess(id, user.id, admin)
    if (error) return error

    await logAudit(user.id, 'view_report', 'report', id)

    return NextResponse.json({ report })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = (await req.json()) as UpdateReportBody

    if (body.content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { report, error: accessError } = await getReportWithAccess(id, user.id, admin)
    if (accessError) return accessError

    // Clients cannot edit reports
    if ((report as { agent_id?: string }).agent_id !== user.id) {
      const { data: callerProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (callerProfile?.role === 'client') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
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

    if (updateError) {
      console.error('[PATCH /api/reports/[id]]', updateError)
      return NextResponse.json({ error: 'Error updating report' }, { status: 500 })
    }

    return NextResponse.json({ report: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
