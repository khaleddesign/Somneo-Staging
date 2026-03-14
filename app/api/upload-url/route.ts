import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    // Verify auth server-side
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { objectPath } = await req.json()

    // Security: path must start with the user's ID
    if (!objectPath || !objectPath.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'Path not authorized' }, { status: 403 })
    }

    // Generate signed URL with admin client (bypass RLS)
    const admin = createAdminClient()
    const { data, error } = await admin.storage
      .from('study-files')
      .createSignedUploadUrl(objectPath)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Unable to generate URL' }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
