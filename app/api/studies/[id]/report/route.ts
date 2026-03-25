import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Retrieve profile + study in parallel
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('report_path, client_id, assigned_agent_id').eq('id', id).maybeSingle(),
    ])

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    if (studyResult.error || !studyResult.data) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    const { role } = profileResult.data
    const study = studyResult.data

    // Verify access based on role
    const hasAccess =
      role === 'admin' ||
      role === 'agent' ||
      role === 'client'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!study.report_path) {
      return NextResponse.json({ error: 'Report not available' }, { status: 404 })
    }

    // Normalize path (remove bucket prefix if present)
    const storagePath = study.report_path.startsWith('reports-files/')
      ? study.report_path.slice('reports-files/'.length)
      : study.report_path

    // Generate signed URL via admin client (bypass RLS)
    const { data: signed, error: signedError } = await admin.storage
      .from('reports-files')
      .createSignedUrl(storagePath, 15 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'Unable to generate report URL' }, { status: 500 })
    }

    // --- Trace d'Audit ---
    const clientIp = _req.headers.get('x-forwarded-for')?.split(',')[0] || _req.headers.get('x-real-ip') || 'unknown'
    const userAgent = _req.headers.get('user-agent') || 'unknown'

    // Audit (non-blocking)
    try {
      await admin.from('audit_logs').insert({
        user_id: user.id,
        action: 'download_request',
        resource_type: 'report_pdf',
        resource_id: id,
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { role }
      })
    } catch (auditError) {
      console.error('[Audit Error]', auditError)
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err: unknown) {
    console.error('[GET /api/studies/[id]/report]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify the role + l'assignation de l'study
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('id, assigned_agent_id').eq('id', id).maybeSingle(),
    ])

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }

    const { role } = profileResult.data

    if (!['agent', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Only agents and admins can upload a report' }, { status: 403 })
    }

    if (studyResult.error || !studyResult.data) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 })
    }

    // Upload dans le bon bucket via admin (bypass RLS)
    const uploadPath = `${id}/report.pdf`
    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(uploadPath, file, { upsert: true, contentType: 'application/pdf' })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Update study: set report path, mark as completed
    const reportPath = `reports-files/${id}/report.pdf`
    const now = new Date().toISOString()
    const { error: updateError } = await admin
      .from('studies')
      .update({ report_path: reportPath, status: 'termine', completed_at: now, updated_at: now })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, report_path: reportPath })
  } catch (err: unknown) {
    console.error('[POST /api/studies/[id]/report]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}

