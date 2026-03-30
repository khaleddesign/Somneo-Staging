import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!supabaseUrl || !supabaseServiceKey) process.exit(1)

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  const path = '8a7cc2e5-c48f-44dd-b162-6e9c06eeffc4/8a7cc2e5-c48f-44dd-b162-6e9c06eeffc4-1774481593273.zip'
  console.log("Querying storage.objects for path:", path)
  
  // Need to use postgrest to query storage.objects if it's exposed, but it's not exposed by default on public schema.
  // Since we are using typescript, we can try to query it. If it fails due to permissions/schema, we'll see.
  // Supabase exposes storage schema via the client sometimes, or we can use RPC if available.
  const { data, error } = await adminClient.from('storage.objects').select('*').eq('name', path)
  console.log('Result:', data, 'Error:', error?.message || null)

  // Wait, storage.objects is in the `storage` schema, not `public`.
  // createClient assumes `public` schema. We can specify schema:
  const adminClientStorage = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: 'storage' } })
  const { data: sData, error: sErr } = await adminClientStorage.from('objects').select('*').eq('name', path)
  console.log('Storage schema objects result:', sData, 'Error:', sErr?.message || null)
}
run().catch(console.error)
