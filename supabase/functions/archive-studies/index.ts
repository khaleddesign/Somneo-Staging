import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { S3Client, HeadObjectCommand } from 'npm:@aws-sdk/client-s3@3'

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID') || ''
    const r2AccessKey = Deno.env.get('R2_ACCESS_KEY_ID') || ''
    const r2SecretKey = Deno.env.get('R2_SECRET_ACCESS_KEY') || ''
    const r2Bucket = Deno.env.get('R2_BUCKET_NAME') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey },
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: studies, error: fetchErr } = await admin
      .from('studies')
      .select('id, file_path')
      .eq('status', 'termine')
      .lt('completed_at', thirtyDaysAgo.toISOString())
      .not('file_path', 'is', null)
      .is('archived_at', null)

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const errors: string[] = []
    let archived = 0
    let skippedNotInR2 = 0

    for (const study of studies || []) {
      if (!study.file_path) continue

      try {
        // Only delete from Supabase Storage if confirmed backed up in R2.
        // file_path is the path within the study-files bucket (no bucket prefix).
        const r2Key = `study-files/${study.file_path}`
        let backedUp = false
        try {
          await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: r2Key }))
          backedUp = true
        } catch (e: unknown) {
          const err = e as { name?: string; $metadata?: { httpStatusCode?: number } }
          if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) throw e
        }

        if (!backedUp) {
          console.warn(`[archive-studies] Skipping ${study.id} — not yet in R2`)
          skippedNotInR2++
          continue
        }

        // FILE DELETION DISABLED — waiting for R2 backup confirmation.
        // To re-enable: uncomment the block below and remove this comment.
        // const { error: deleteErr } = await admin.storage.from('study-files').remove([study.file_path])
        // if (deleteErr) console.warn(`[archive-studies] Storage delete failed for ${study.id}:`, deleteErr)

        const { error: updateErr } = await admin
          .from('studies')
          .update({ file_path: null, archived_at: new Date().toISOString() })
          .eq('id', study.id)

        if (updateErr) {
          errors.push(`DB update failed for study ${study.id}: ${updateErr.message}`)
        } else {
          archived++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Error processing study ${study.id}: ${msg}`)
        console.error(msg)
      }
    }

    return new Response(
      JSON.stringify({ success: true, archived, skippedNotInR2, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
