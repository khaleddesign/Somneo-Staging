import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET non configuré — route désactivée')
      return NextResponse.json({ error: 'Configuration manquante' }, { status: 503 })
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // 1. Calculer la date limite (il y a 72 heures)
    const deadline = new Date()
    deadline.setHours(deadline.getHours() - 72)
    const deadlineStr = deadline.toISOString()

    // 2. Trouver toutes les études terminées depuis plus de 72h et ayant encore un fichier attaché
    const { data: expiredStudies, error: fetchError } = await adminSupabase
      .from('studies')
      .select('id, file_path, patient_reference')
      .eq('status', 'termine')
      .not('file_path', 'is', null) // Assurez-vous que le fichier n'est pas déjà effacé!
      .lt('updated_at', deadlineStr)

    if (fetchError) {
      console.error('[CRON CLEANUP] Erreur récupération des études:', fetchError)
      return NextResponse.json({ error: 'Erreur DB' }, { status: 500 })
    }

    if (!expiredStudies || expiredStudies.length === 0) {
      return NextResponse.json({ message: 'Aucun fichier à nettoyer.' })
    }

    let deletedCount = 0
    let failedCount = 0

    // 3. Boucler et supprimer les fichiers du bucket
    for (const study of expiredStudies) {
      if (!study.file_path) continue

      try {
        const { error: storageError } = await adminSupabase.storage
          .from('study-files')
          .remove([study.file_path])

        if (storageError) {
          console.error(`[CRON CLEANUP] Impossible d'effacer le fichier pour l'étude ${study.id}:`, storageError)
          failedCount++
          continue
        }

        // 4. Mettre à jour la ligne SQL pour marquer le `file_path` = null
        const { error: updateError } = await adminSupabase
          .from('studies')
          .update({ file_path: null })
          .eq('id', study.id)

        if (updateError) {
          console.error(`[CRON CLEANUP] Fichier supprimé mais échec update SQL pour l'étude ${study.id}:`, updateError)
          failedCount++
          continue
        }

        deletedCount++
      } catch (err) {
        console.error(`[CRON CLEANUP] Erreur inattendue pour ${study.id}:`, err)
        failedCount++
      }
    }

    return NextResponse.json({ 
      success: true,
      cleanedFiles: deletedCount,
      failedFiles: failedCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CRON CLEANUP] Erreur fatale:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
