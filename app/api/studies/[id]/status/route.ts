import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  // Vérifier le rôle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileError || !profile || !['agent', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const body = (await req.json()) as { status?: string }
  const status = body.status
  if (status !== 'en_cours' && status !== 'termine' && status !== 'annule') {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }
  // Récupérer l'ancien statut
  const { data: oldStudy, error: oldError } = await supabase
    .from('studies')
    .select('status')
    .eq('id', id)
    .single()
  if (oldError || !oldStudy) {
    return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
  }
  // State machine: validate transition
  const validTransitions: Record<string, string[]> = {
    en_attente: ['en_cours', 'annule'],
    en_cours: ['termine', 'annule'],
    termine: [],
    annule: [],
  }
  const allowed = validTransitions[oldStudy.status] ?? []
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: `Transition invalide: ${oldStudy.status} → ${status}` },
      { status: 422 }
    )
  }
  // Mettre à jour l'étude
  const updateFields: { status: string; updated_at: string; completed_at?: string } = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'termine') {
    updateFields.completed_at = new Date().toISOString()
  }
  const { error: updateError } = await supabase
    .from('studies')
    .update(updateFields)
    .eq('id', id)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  // Historique
  await supabase.from('study_history').insert({
    study_id: id,
    old_status: oldStudy.status,
    new_status: status,
    changed_by: user.id,
    changed_at: new Date().toISOString(),
  })
  return NextResponse.json({ success: true })
}
