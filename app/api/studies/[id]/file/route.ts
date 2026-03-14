import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { file_path, checksum, file_size_orig } = body

    if (!file_path || !checksum || !file_size_orig) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user is the owner
    const { data: study, error: studyErr } = await supabase
      .from('studies')
      .select('client_id')
      .eq('id', id)
      .maybeSingle()
    if (studyErr || !study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }
    if (study.client_id !== userData.user.id) {
      return NextResponse.json({ error: 'Access forbidden' }, { status: 403 })
    }

    const { error: updateErr } = await supabase
      .from('studies')
      .update({
        file_path,
        checksum,
        file_size_orig,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
