"use client"

import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

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
        <header className="lg:hidden flex items-center justify-between bg-[#06111f] text-white h-14 px-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-teal-400 text-lg font-bold" style={{ fontFamily: 'var(--font-syne)' }}>
            SomnoConnect
          </span>
          <div />
        </header>
        <main className="bg-[#f8fafc] flex-1 p-6 overflow-auto ml-0 lg:ml-60">
      {children}
    </main>
      </div>
    </div>
  )
}
