import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseServiceKey) process.exit(1)

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const id = '84584cb2-662c-42b8-b4ee-a42aa753174e' // The latest study from earlier
  const { data: study } = await adminClient.from('studies').select('file_path').eq('id', id).single()
  
  if (study?.file_path) {
    let storagePath = study.file_path
    if (storagePath.startsWith('study-files/')) storagePath = storagePath.slice('study-files/'.length)
    if (storagePath.startsWith('studies-files/')) storagePath = storagePath.slice('studies-files/'.length)
    
    console.log('Downloading exactly:', storagePath)
    
    const { data: d1, error: err1 } = await adminClient.storage.from('study-files').download(storagePath)
    console.log('study-files download result:', d1 ? `Got blob of size ${d1.size}` : 'NULL', 'Error:', err1?.message)
  }
}
run().catch(console.error)
