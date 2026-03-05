"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  FileText,
  Users,
  Settings,
  LifeBuoy,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email || null)
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setRole(data?.role || null)
          })
      }
    })
  }, [])

  const agentItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/agent', icon: Home },
    { label: 'Études', href: '/dashboard/agent/studies', icon: FileText },
    { label: 'Clients', href: '/dashboard/agent/clients', icon: Users },
    { label: 'Paramètres', href: '/dashboard/agent/settings', icon: Settings },
  ]
  const clientItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/client', icon: Home },
    { label: 'Mes études', href: '/dashboard/client/studies', icon: FileText },
    { label: 'Support', href: '/support', icon: LifeBuoy },
  ]

  const items = role === 'agent' || role === 'admin' ? agentItems : clientItems

  return (
    <div>
      {/* overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-[#06111f] text-white z-50 transform transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <span className="text-teal text-xl font-display">
            SomnoConnect
          </span>
          <button onClick={onClose} className="text-sand">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="px-6 py-4 hidden lg:block">
          <span className="text-teal text-2xl font-display leading-none">
            SomnoConnect
          </span>
          <p className="text-sand/40 text-[9px] tracking-[3px] uppercase font-heading mt-1">BY SOMNOVENTIS</p>
        </div>
        <nav className="mt-6 px-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} onClick={onClose} className={`flex items-center gap-3 px-4 py-2 my-1 rounded-lg transition-colors ${
                active
                  ? 'bg-teal/10 border-l-2 border-teal text-teal'
                  : 'text-sand/50 hover:text-sand hover:bg-white/4'
              }`}>
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-heading tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-6 py-4">
          {email && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center text-teal font-heading uppercase">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-sand/60 break-all font-body">{email}</span>
            </div>
          )}
          <button
            onClick={async () => {
              const supabase = createClient()
              await supabase.auth.signOut()
              window.location.href = '/auth/login'
            }}
            className="mt-3 flex items-center gap-2 text-sm text-sand/50 hover:text-red-400 font-body"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </div>
  )
}
