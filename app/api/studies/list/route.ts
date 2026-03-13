import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/encryption'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    let studies

    if (profile.role === 'client') {
      const { data, error } = await supabase
        .from('studies')
        .select('*')
        .eq('client_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      studies = data
    } else {
      // agent/admin : bypass RLS pour voir toutes les études
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('studies')
        .select('*, profiles!studies_client_id_fkey(full_name, email)')
        .order('submitted_at', { ascending: false })

      if (error) throw error
      studies = data
    }

    if (studies) {
      studies = studies.map(study => ({
        ...study,
        patient_reference: decrypt(study.patient_reference)
      }))
    }

    return NextResponse.json({ studies })
  } catch (err) {
    console.error('[GET /api/studies/list]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
