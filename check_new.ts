import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env vars")
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("Fetching the absolute most recent study...")
  const { data: study, error } = await adminClient.from('studies').select('id, file_path, created_at, client_id').order('created_at', { ascending: false }).limit(1).single()
  console.log('Most recent study:', study, 'Error:', error?.message)

  if (study?.file_path) {
    let storagePath = study.file_path
    if (storagePath.startsWith('study-files/')) storagePath = storagePath.slice('study-files/'.length)
    if (storagePath.startsWith('studies-files/')) storagePath = storagePath.slice('studies-files/'.length)
    
    console.log('Normalized storage path to query against study-files bucket:', storagePath)
    
    // First, list the dir
    const dir = storagePath.split('/')[0]
    console.log(`Listing directory ${dir} in study-files:`)
    const { data: listData, error: listErr } = await adminClient.storage.from('study-files').list(dir)
    console.log('List result:', listData?.map(f => f.name), listErr?.message)

    console.log(`Listing directory ${dir} in studies-files:`)
    const { data: listData2 } = await adminClient.storage.from('studies-files').list(dir)
    console.log('List result studies-files:', listData2?.map(f => f.name))

    // Check signed URL on study-files
    const { data: signed1, error: err1 } = await adminClient.storage.from('study-files').createSignedUrl(storagePath, 60)
    console.log('study-files signed URL generation error:', err1 ? (err1.message || err1) : 'success')

    // Check signed URL on studies-files
    const { data: signed2, error: err2 } = await adminClient.storage.from('studies-files').createSignedUrl(storagePath, 60)
    console.log('studies-files signed URL generation error:', err2 ? (err2.message || err2) : 'success')
  }
}
run().catch(console.error)
