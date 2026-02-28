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
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Vérifie que l'utilisateur est bien le propriétaire
    const { data: study, error: studyErr } = await supabase
      .from('studies')
      .select('client_id')
      .eq('id', id)
      .maybeSingle()
    if (studyErr || !study) {
      return NextResponse.json({ error: 'Étude non trouvée' }, { status: 404 })
    }
    if (study.client_id !== userData.user.id) {
      return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur interne' }, { status: 500 })
  }
}
