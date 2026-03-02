'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, FileText, Building2, Settings, LogOut, X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Vue globale', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/admin/agents', icon: Users },
  { label: 'Études', href: '/dashboard/admin/studies', icon: FileText },
  { label: 'Clients', href: '/dashboard/admin/clients', icon: Building2 },
  { label: 'Paramètres', href: '/dashboard/admin/settings', icon: Settings },
]

export default function AdminSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email || null)
    })
  }, [])

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-midnight text-white z-50 transform transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
          <span className="text-teal text-xl font-display">SomnoConnect</span>
          <button onClick={onClose} className="text-sand">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 hidden lg:block border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-teal text-xl font-display">SomnoConnect</span>
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-heading tracking-wide">ADMIN</span>
          </div>
          <p className="text-sand/50 text-xs tracking-widest uppercase font-heading mt-1">BY SOMNOVENTIS</p>
        </div>

        <nav className="mt-6 px-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-2 my-1 rounded ${
                  active
                    ? 'bg-teal/10 text-teal border-l-2 border-teal'
                    : 'text-sand/70 hover:text-sand hover:bg-white/5'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-body">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-6 py-4 border-t border-white/10 absolute bottom-0 w-full">
          {email && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-teal/20 rounded-full flex items-center justify-center text-teal font-heading">
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
            className="flex items-center gap-2 text-sm text-sand/50 hover:text-red-400 font-body"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
