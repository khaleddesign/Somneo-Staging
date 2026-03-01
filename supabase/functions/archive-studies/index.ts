import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch studies eligible for archival
    const { data: studies, error: fetchErr } = await admin
      .from('studies')
      .select('id, file_path')
      .eq('status', 'termine')
      .lt('completed_at', thirtyDaysAgo.toISOString())
      .not('file_path', 'is', null)
      .is('archived_at', null)

    if (fetchErr) {
      console.error('Error fetching studies:', fetchErr)
      return new Response(
        JSON.stringify({ error: fetchErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const errors: string[] = []
    let archived = 0

    for (const study of studies || []) {
      try {
        // Parse file_path to get bucket and path
        if (study.file_path) {
          const parts = study.file_path.split('/')
          const bucket = parts[0] || 'studies-files'
          const filePath = parts.slice(1).join('/')

          if (filePath) {
            // Delete file from storage
            const { error: deleteErr } = await admin.storage
              .from(bucket)
              .remove([filePath])

            if (deleteErr) {
              console.warn(`Warning deleting file ${study.id}:`, deleteErr)
              // Continue even if delete fails
            }
          }
        }

        // Mark as archived
        const { error: updateErr } = await admin
          .from('studies')
          .update({
            file_path: null,
            archived_at: new Date().toISOString(),
          })
          .eq('id', study.id)

        if (updateErr) {
          errors.push(`Error archiving study ${study.id}: ${updateErr.message}`)
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
      JSON.stringify({
        success: true,
        archived,
        errors,
        message: `${archived} file(s) archived`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Archive function error:', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
