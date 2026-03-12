import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
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

    const admin = createAdminClient()

    // Récupérer les études éligibles pour archivage
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: studies, error: fetchErr } = await admin
      .from('studies')
      .select('id, file_path')
      .eq('status', 'termine')
      .lt('completed_at', thirtyDaysAgo.toISOString())
      .not('file_path', 'is', null)
      .is('archived_at', null)

    if (fetchErr) throw fetchErr

    const errors: string[] = []
    let archived = 0

    for (const study of studies || []) {
      try {
        // Extraire le bucket et chemin du file_path
        if (study.file_path) {
          const parts = study.file_path.split('/')
          const bucket = parts[0] || 'study-files'
          const filePath = parts.slice(1).join('/')

          if (filePath) {
            // Supprimer le fichier du bucket
            const { error: deleteErr } = await admin.storage
              .from(bucket)
              .remove([filePath])

            if (deleteErr) {
              console.warn(`Erreur suppression fichier ${study.id}:`, deleteErr)
              // Continue even if delete fails, mark as archived
            }
          }
        }

        // Marquer comme archivé
        const { error: updateErr } = await admin
          .from('studies')
          .update({
            file_path: null,
            archived_at: new Date().toISOString(),
          })
          .eq('id', study.id)

        if (updateErr) {
          errors.push(`Erreur archivage étude ${study.id}: ${updateErr.message}`)
        } else {
          archived++
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Erreur étude ${study.id}: ${msg}`)
      }
    }

    return NextResponse.json({
      archived,
      errors,
      message: `${archived} fichier${archived !== 1 ? 's' : ''} archivé${archived !== 1 ? 's' : ''}`,
    })
  } catch (err: unknown) {
    console.error('[POST /api/archive]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}
