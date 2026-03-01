'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/custom/AppLayout'
import AgentStats from '@/components/custom/AgentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, Users, Settings } from 'lucide-react'

export default function AgentDashboardPage() {
  const [agentName, setAgentName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single()

        setAgentName(profileData?.full_name || 'Agent')
        setIsAdmin(profileData?.role === 'admin')
      }
    }

    fetchProfile()
  }, [])

  return (
    <AppLayout>
      <div className="p-8">
        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            Bonjour, {agentName} 👋
          </h1>
          <p className="text-gray-600 mt-2">Bienvenue sur votre dashboard SomnoConnect</p>
        </div>
        {/* KPIs Section */}
        <div className="mb-10">
          <AgentStats />
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Studies Card */}
          <Link href="/dashboard/agent/studies">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-teal-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal-50 rounded-lg">
                  <FileText className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Études</h3>
              <p className="text-gray-600 text-sm">Gérez vos études et consultez les détails</p>
              <div className="mt-4">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                  Accéder
                </Button>
              </div>
            </Card>
          </Link>

          {/* Clients Card */}
          <Link href="/dashboard/agent/clients">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-teal-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal-50 rounded-lg">
                  <Users className="h-6 w-6 text-teal-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Clients</h3>
              <p className="text-gray-600 text-sm">Gérez vos clients et invitez-en de nouveaux</p>
              <div className="mt-4">
                <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                  Accéder
                </Button>
              </div>
            </Card>
          </Link>

          {/* Admin Panel Card - Only for admins */}
          {isAdmin && (
            <Link href="/dashboard/agent/settings">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-200 bg-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">Panel Admin</h3>
                <p className="text-purple-700 text-sm">Gérez les paramètres et configurations</p>
                <div className="mt-4">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full">
                    Accéder
                  </Button>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
