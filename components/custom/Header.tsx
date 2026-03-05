"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

// ssr: false — même raison que dans AppLayout : évite le mismatch d'IDs Radix (Popover)
const NotificationBell = dynamic(() => import('@/components/custom/NotificationBell'), { ssr: false })

export default function Header() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email ?? null)
    })
  }, [])

  const handleLogout = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-8">
      <div className="text-xl font-bold text-blue-600">SomnoConnect</div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {email && <span className="text-sm text-gray-600">{email}</span>}
        <Button
          onClick={handleLogout}
          disabled={loading}
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          {loading ? 'Déconnexion...' : 'Déconnexion'}
        </Button>
      </div>
    </header>
  )
}
