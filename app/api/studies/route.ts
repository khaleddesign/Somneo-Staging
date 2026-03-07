import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { studySchema } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = studySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 },
      )
    }
    const { patient_reference, study_type, notes, priority } = parsed.data

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
