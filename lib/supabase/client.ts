import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton — une seule instance par session browser
// Évite le conflit de lock gotrue-js quand plusieurs composants
// appellent createClient() simultanément (React Strict Mode, multi-mount)
let client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
