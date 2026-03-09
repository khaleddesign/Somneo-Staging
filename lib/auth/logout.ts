'use client'

import { createClient } from '@/lib/supabase/client'

export async function logoutAndRedirect() {
  const supabase = createClient()

  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {}

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch {}

  window.location.replace('/auth/login')
}
