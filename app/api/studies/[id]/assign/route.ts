import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: study, error: studyError } = await admin
      .from('studies')
      .select('id, assigned_agent_id, status')
      .eq('id', id)
      .single()

    if (studyError || !study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    if (study.assigned_agent_id) {
      return NextResponse.json({ error: 'Cette étude est déjà assignée' }, { status: 409 })
    }

    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await admin
      .from('studies')
      .update({
        assigned_agent_id: user.id,
        status: 'en_cours',
        updated_at: now,
      })
      .eq('id', id)
      .select('id, assigned_agent_id, status')
      .single()

    if (updateError || !updated) {
      console.error('[PATCH /api/studies/[id]/assign] update error', updateError)
      return NextResponse.json({ error: 'Impossible de prendre en charge cette étude' }, { status: 409 })
    }

    const { error: historyError } = await admin.from('study_history').insert({
      study_id: id,
      old_status: 'en_attente',
      new_status: 'en_cours',
      changed_by: user.id,
      changed_at: now,
    })

    if (historyError) {
      console.error('[PATCH /api/studies/[id]/assign] history error', historyError)
      return NextResponse.json({ error: 'Assignation effectuée mais historique indisponible' }, { status: 500 })
    }

    return NextResponse.json({ success: true, study: updated })
  } catch (err: unknown) {
    console.error('[PATCH /api/studies/[id]/assign]', err)
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
