import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateMagicBytes } from '@/lib/validation/magicBytes'

const BUCKET = 'study-files'
const ALLOWED_EXTENSIONS = ['edf', 'edf+', 'bdf', 'zip']

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const fileExt = String(body?.file_ext ?? '').toLowerCase().replace(/^\./, '')

    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 })
    }

    // Magic bytes validation: client sends first 8 bytes as base64
    // If provided, validate the file signature before issuing the upload token
    if (body?.file_header_b64) {
      const headerBuffer = Buffer.from(String(body.file_header_b64), 'base64')
      const magicResult = validateMagicBytes(headerBuffer, `file.${fileExt}`)
      if (!magicResult.valid) {
        return NextResponse.json(
          { error: `File validation failed: ${magicResult.reason}` },
          { status: 400 }
        )
      }
    }

    // Path scoped to the user — matches storage RLS policy
    const objectPath = `${user.id}/${user.id}-${Date.now()}.${fileExt}`

    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectPath)

    if (error || !data) {
      console.error('[POST /api/upload/token]', error)
      return NextResponse.json({ error: 'Unable to create upload token' }, { status: 500 })
    }

    // Return the scoped token and path — never the full user JWT
    return NextResponse.json({
      token: data.token,
      path: objectPath,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
