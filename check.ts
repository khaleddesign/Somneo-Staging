import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseServiceKey) process.exit(1)

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const dir = '8a7cc2e5-c48f-44dd-b162-6e9c06eeffc4'
  console.log('Listing directory:', dir, 'in bucket study-files')
  const { data, error } = await adminClient.storage.from('study-files').list(dir)
  console.log('study-files contents:', data, 'Error:', error?.message || null)

  console.log('Listing directory:', dir, 'in bucket studies-files')
  const { data: d2, error: e2 } = await adminClient.storage.from('studies-files').list(dir)
  console.log('studies-files contents:', d2, 'Error:', e2?.message || null)
}
run().catch(console.error)
