import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  study_id?: string
  assigned_agent_id?: string | null
}

export async function PATCH(req: Request) {
  try {
    const body: Body = await req.json()
    const { study_id, assigned_agent_id } = body

    if (!study_id) {
      return NextResponse.json({ error: 'study_id requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { error: updateError } = await admin
      .from('studies')
      .update({
        assigned_agent_id: assigned_agent_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', study_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[PATCH /api/studies/reassign]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
