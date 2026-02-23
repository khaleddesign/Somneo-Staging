import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      const { data, error } = await supabase
        .from('studies')
        .select('*, profiles!studies_client_id_fkey(full_name, email)')
        .order('submitted_at', { ascending: false })

      if (error) throw error
      studies = data
    }

    return NextResponse.json({ studies })
  } catch (err) {
    console.error('[GET /api/studies/list]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
