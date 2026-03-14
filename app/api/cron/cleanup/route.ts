import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET not configured — route disabled')
      return NextResponse.json({ error: 'Configuration missing' }, { status: 503 })
    }
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // 1. Calculate the cutoff date (72 hours ago)
    const deadline = new Date()
    deadline.setHours(deadline.getHours() - 72)
    const deadlineStr = deadline.toISOString()

    // 2. Find all completed studies older than 72h that still have a file attached
    const { data: expiredStudies, error: fetchError } = await adminSupabase
      .from('studies')
      .select('id, file_path, patient_reference')
      .eq('status', 'termine')
      .not('file_path', 'is', null) // Ensure file has not already been deleted
      .lt('updated_at', deadlineStr)

    if (fetchError) {
      console.error('[CRON CLEANUP] Error fetching studies:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!expiredStudies || expiredStudies.length === 0) {
      return NextResponse.json({ message: 'No files to clean up.' })
    }

    let deletedCount = 0
    let failedCount = 0

    // 3. Loop and delete files from the bucket
    for (const study of expiredStudies) {
      if (!study.file_path) continue

      try {
        const { error: storageError } = await adminSupabase.storage
          .from('study-files')
          .remove([study.file_path])

        if (storageError) {
          console.error(`[CRON CLEANUP] Impossible d'effacer le fichier pour l'study ${study.id}:`, storageError)
          failedCount++
          continue
        }

        // 4. Update the SQL row to set file_path = null
        const { error: updateError } = await adminSupabase
          .from('studies')
          .update({ file_path: null })
          .eq('id', study.id)

        if (updateError) {
          console.error(`[CRON CLEANUP] File deleted but SQL update failed for study ${study.id}:`, updateError)
          failedCount++
          continue
        }

        deletedCount++
      } catch (err) {
        console.error(`[CRON CLEANUP] Unexpected error for ${study.id}:`, err)
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
    console.error('[CRON CLEANUP] Fatal error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
