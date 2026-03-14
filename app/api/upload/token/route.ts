import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'study-files'
const ALLOWED_EXTENSIONS = ['edf', 'edf+', 'bdf', 'zip']

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const fileExt = String(body?.file_ext ?? '').toLowerCase().replace(/^\./, '')

    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: 'Extension de fichier non autorisée' }, { status: 400 })
    }

    // Path scoped to the user — matches storage RLS policy
    const objectPath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath)

    if (error || !data) {
      console.error('[POST /api/upload/token]', error)
      return NextResponse.json({ error: 'Impossible de créer le token d\'upload' }, { status: 500 })
    }

    // Return the scoped token and path — never the full user JWT
    return NextResponse.json({
      token: data.token,
      path: objectPath,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
