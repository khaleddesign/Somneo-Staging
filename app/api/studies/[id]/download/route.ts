import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Retrieve profile and study in a single pass to verify access
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('file_path, client_id, assigned_agent_id').eq('id', id).maybeSingle(),
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

    if (!study.file_path) {
      return NextResponse.json({ error: 'File archived or not available' }, { status: 404 })
    }

    const storagePath = study.file_path.startsWith('studies-files/')
      ? study.file_path.slice('studies-files/'.length)
      : study.file_path

    const { data: signed, error: signedError } = await admin.storage
      .from('studies-files')
      .createSignedUrl(storagePath, 15 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'Failed to generate signed URL' }, { status: 500 })
    }

    // --- Trace d'Audit ---
    const clientIp = _req.headers.get('x-forwarded-for')?.split(',')[0] || _req.headers.get('x-real-ip') || 'unknown'
    const userAgent = _req.headers.get('user-agent') || 'unknown'

    // fire-and-forget logging
    admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'download_request',
      resource_type: 'edf_file',
      resource_id: id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: { role }
    }).then(({ error: auditErr }) => {
      if (auditErr) console.error('[Audit Error]', auditErr)
    })

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
