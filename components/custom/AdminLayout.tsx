'use client'

import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="lg:hidden flex items-center justify-between bg-midnight text-white h-14 px-4">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-teal text-lg font-display">SomnoConnect</span>
            <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-heading">ADMIN</span>
          </div>
          <div />
        </header>
        <main className="bg-slate-50 flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
