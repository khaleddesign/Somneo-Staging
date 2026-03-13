const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
  const { data, error } = await supabase.from('studies').select('id, file_path, client_id, assigned_agent_id, created_at').order('created_at', { ascending: false }).limit(5)
  console.log("Recent studies:", data)

  if (data && data.length > 0) {
    for (const study of data) {
      if (study.file_path) {
        let storagePath = study.file_path
        if (storagePath.startsWith('study-files/')) {
          storagePath = storagePath.slice('study-files/'.length)
        }
        
        const folder = storagePath.split('/')[0]
        if (folder) {
          const { data: files, error: storageErr } = await supabase.storage.from('study-files').list(folder)
          console.log(`Files in ${folder}:`, files?.map(f => f.name))
        }
      }
    }
  }
}
check()
