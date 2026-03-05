"use client"

import { ReactNode, useState } from 'react'
import dynamic from 'next/dynamic'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import HeaderWrapper from './HeaderWrapper'

// ssr: false — NotificationBell est purement client-side (auth Supabase, fetch).
// Le SSR-er génère des IDs Radix (Popover) différents entre le pass SSR et le pass RSC,
// provoquant une erreur de hydration en cascade sur Tabs/Select. Sans SSR, pas de mismatch.
const NotificationBell = dynamic(() => import('./NotificationBell'), { ssr: false })

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        {/* mobile header */}
        <header className="lg:hidden flex items-center justify-between bg-midnight text-white h-14 px-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-teal text-lg font-display">
            SomnoConnect
          </span>
          <NotificationBell />
        </header>
        <div className="hidden lg:block">
          <HeaderWrapper />
        </div>
        <main className="bg-[#f0f4f8] flex-1 p-6 overflow-auto ml-0 lg:ml-60">
      {children}
    </main>
      </div>
    </div>
  )
}
