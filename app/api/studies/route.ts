import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { studySchema } from '@/lib/validation'
import { encrypt } from '@/lib/encryption'

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

    const callerId = userData.user.id
    const admin = createAdminClient()

    // Récupérer le profil de l'appelant
    const { data: callerProfile, error: profileErr } = await admin
      .from('profiles')
      .select('role, institution_id')
      .eq('id', callerId)
      .maybeSingle()

    if (profileErr || !callerProfile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
    }

    let client_id: string

    if (callerProfile.role === 'client') {
      // Le client crée une étude pour lui-même
      client_id = callerId
    } else if (callerProfile.role === 'agent' || callerProfile.role === 'admin') {
      // L'agent/admin doit fournir un client_id valide dans sa propre institution
      const bodyClientId = raw.client_id as string | undefined
      if (!bodyClientId) {
        return NextResponse.json({ error: 'client_id requis pour les agents/admins' }, { status: 400 })
      }

      // Vérifier que le client appartient à la même institution
      const { data: clientProfile, error: clientErr } = await admin
        .from('profiles')
        .select('id, role, institution_id')
        .eq('id', bodyClientId)
        .maybeSingle()

      if (clientErr || !clientProfile) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
      }

      if (clientProfile.role !== 'client') {
        return NextResponse.json({ error: 'L\'utilisateur cible n\'est pas un client' }, { status: 400 })
      }

      if (clientProfile.institution_id !== callerProfile.institution_id) {
        return NextResponse.json({ error: 'Accès refusé : client hors institution' }, { status: 403 })
      }

      client_id = bodyClientId
    } else {
      return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 })
    }

    // Insertion via le client admin (bypass RLS, autorisations déjà vérifiées manuellement)
    const encryptedPatientRef = encrypt(patient_reference)
    const { data, error } = await admin
      .from('studies')
      .insert({
        client_id,
        patient_reference: encryptedPatientRef,
        study_type,
        notes: notes ?? '',
        priority,
        status: 'en_attente',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[studies] DB Error:', error)
      return NextResponse.json({ error: 'Erreur lors de la création de l\'étude' }, { status: 500 })
    }

    return NextResponse.json({ study_id: data.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
