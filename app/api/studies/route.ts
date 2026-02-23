import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { patient_reference, study_type, notes, priority } = body

    if (!patient_reference || !study_type || !priority) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const client_id = userData.user.id

    const { data, error } = await supabase
      .from('studies')
      .insert({
        client_id,
        patient_reference,
        study_type,
        notes: notes ?? '',
        priority,
        status: 'en_attente',
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ study_id: data.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur interne' }, { status: 500 })
  }
}
