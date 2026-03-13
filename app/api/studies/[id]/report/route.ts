import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Récupérer profil + étude en parallèle
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('report_path, client_id, assigned_agent_id').eq('id', id).maybeSingle(),
    ])

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
    }

    if (studyResult.error || !studyResult.data) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    const { role } = profileResult.data
    const study = studyResult.data

    // Vérifier l'accès selon le rôle
    const hasAccess =
      role === 'admin' ||
      (role === 'client' && study.client_id === user.id) ||
      (role === 'agent' && study.assigned_agent_id === user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (!study.report_path) {
      return NextResponse.json({ error: 'Rapport non disponible' }, { status: 404 })
    }

    // Normaliser le chemin (retirer le préfixe bucket si présent)
    const storagePath = study.report_path.startsWith('reports-files/')
      ? study.report_path.slice('reports-files/'.length)
      : study.report_path

    // Générer une URL signée via le client admin (bypass RLS)
    const { data: signed, error: signedError } = await admin.storage
      .from('reports-files')
      .createSignedUrl(storagePath, 60 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'Impossible de générer l\'URL du rapport' }, { status: 500 })
    }

    // --- Trace d'Audit ---
    const clientIp = _req.headers.get('x-forwarded-for')?.split(',')[0] || _req.headers.get('x-real-ip') || 'unknown'
    const userAgent = _req.headers.get('user-agent') || 'unknown'

    // fire-and-forget logging
    admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'download_request',
      resource_type: 'report_pdf',
      resource_id: id,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: { role }
    }).then(({ error: auditErr }) => {
      if (auditErr) console.error('[Audit Error]', auditErr)
    })

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err: unknown) {
    console.error('[GET /api/studies/[id]/report]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Vérifier le rôle + l'assignation de l'étude
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('id, assigned_agent_id').eq('id', id).maybeSingle(),
    ])

    if (profileResult.error || !profileResult.data) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
    }

    const { role } = profileResult.data

    if (!['agent', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Seuls les agents et admins peuvent uploader un rapport' }, { status: 403 })
    }

    if (studyResult.error || !studyResult.data) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    // Agent : vérifier qu'il est bien assigné à cette étude
    if (role === 'agent' && studyResult.data.assigned_agent_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas assigné à cette étude' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Fichier PDF requis' }, { status: 400 })
    }

    // Upload dans le bon bucket via admin (bypass RLS)
    const uploadPath = `${id}/report.pdf`
    const { error: uploadError } = await admin.storage
      .from('reports-files')
      .upload(uploadPath, file, { upsert: true, contentType: 'application/pdf' })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Mettre à jour l'étude avec le chemin du rapport
    const reportPath = `reports-files/${id}/report.pdf`
    const { error: updateError } = await admin
      .from('studies')
      .update({ report_path: reportPath, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, report_path: reportPath })
  } catch (err: unknown) {
    console.error('[POST /api/studies/[id]/report]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}

