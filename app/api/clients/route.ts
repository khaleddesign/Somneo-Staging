import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est agent ou admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer tous les clients
    const admin = createAdminClient()
    const { data: clients, error } = await admin
      .from('profiles')
      .select('id, full_name, email, created_at, is_suspended')
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ clients })
  } catch (err: unknown) {
    console.error('[GET /api/clients]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { user_id, is_suspended } = body
    if (typeof user_id !== 'string' || typeof is_suspended !== 'boolean') {
      return NextResponse.json({ error: 'user_id et is_suspended requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est agent ou admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Mettre à jour le client
    const admin = createAdminClient()
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ is_suspended })
      .eq('id', user_id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[PATCH /api/clients]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}
