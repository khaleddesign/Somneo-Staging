import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'auth côté serveur
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { objectPath } = await req.json()

    // Sécurité : le chemin doit commencer par l'ID de l'utilisateur
    if (!objectPath || !objectPath.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 })
    }

    // Générer l'URL signée avec le client admin (bypass RLS)
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('study-files')
      .createSignedUploadUrl(objectPath)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Impossible de générer l\'URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
