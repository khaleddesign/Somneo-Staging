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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Récupérer le profil et l'étude en une seule passe pour vérifier l'accès
    const [profileResult, studyResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('studies').select('file_path, client_id, assigned_agent_id').eq('id', id).maybeSingle(),
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
      (role === 'agent' && study.assigned_agent_id === user.id) ||
      (role === 'client' && study.client_id === user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (!study.file_path) {
      return NextResponse.json({ error: 'Fichier archivé ou non disponible' }, { status: 404 })
    }

    const storagePath = study.file_path.startsWith('study-files/')
      ? study.file_path.slice('study-files/'.length)
      : study.file_path

    const { data: signed, error: signedError } = await admin.storage
      .from('study-files')
      .createSignedUrl(storagePath, 60 * 60)

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: signedError?.message || 'Impossible de générer l\'URL signée' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
