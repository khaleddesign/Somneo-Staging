'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/custom/AppLayout'
import AgentStats from '@/components/custom/AgentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, Users, Settings } from 'lucide-react'

interface AgentKpiRow {
  agent_id: string
  agent_name: string
  en_cours: number
  termine_ce_mois: number
}

export default function AgentDashboardPage() {
  const [agentName, setAgentName] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [agentKpis, setAgentKpis] = useState<AgentKpiRow[]>([])
  const [loadingAgentKpis, setLoadingAgentKpis] = useState(false)

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

        const admin = profileData?.role === 'admin'
        setAgentName(profileData?.full_name || 'Agent')
        setIsAdmin(admin)

        if (admin) {
          setLoadingAgentKpis(true)
          const res = await fetch('/api/stats/agents')
          if (res.ok) {
            const data = await res.json()
            setAgentKpis(data.agents || [])
          }
          setLoadingAgentKpis(false)
        }
      }
    }

    fetchProfile()
  }, [])

  return (
    <AppLayout>
      <div className="p-8 bg-[#f0f4f8]">
        {/* Greeting */}
        <div className="mb-10">
            <h1 className="text-4xl text-midnight font-display">
            Bonjour, {agentName} 👋
          </h1>
          <p className="text-gray-500 mt-2 font-body">Bienvenue sur votre dashboard SomnoConnect</p>
        </div>
        {/* KPIs Section */}
        <div className="mb-10">
          <AgentStats />
        </div>

        {isAdmin && (
          <div className="mb-10">
            <Card className="p-6">
              <h2 className="text-xl text-midnight mb-4 font-heading">
                KPI par agent
              </h2>
              {loadingAgentKpis ? (
                <p className="text-sm text-gray-500">Chargement des indicateurs...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left border">Nom agent</th>
                        <th className="px-4 py-2 text-left border">Études en cours</th>
                        <th className="px-4 py-2 text-left border">Études terminées ce mois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentKpis.map((row) => (
                        <tr key={row.agent_id}>
                          <td className="px-4 py-2 border">{row.agent_name}</td>
                          <td className="px-4 py-2 border">{row.en_cours}</td>
                          <td className="px-4 py-2 border">{row.termine_ce_mois}</td>
                        </tr>
                      ))}
                      {agentKpis.length === 0 && (
                        <tr>
                          <td className="px-4 py-3 text-gray-500 border" colSpan={3}>
                            Aucun agent trouvé.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Studies Card */}
          <Link href="/dashboard/agent/studies">
            <Card className="p-6 hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer border border-gray-100 rounded-2xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal/8 rounded-xl">
                  <FileText className="h-6 w-6 text-teal" />
                </div>
              </div>
              <h3 className="text-lg text-midnight mb-1 font-heading">Études</h3>
              <p className="text-gray-600 text-sm font-body">Gérez vos études et consultez les détails</p>
              <div className="mt-4">
                <Button className="bg-teal hover:bg-teal/90 text-white w-full rounded-xl font-heading">
                  Accéder
                </Button>
              </div>
            </Card>
          </Link>

          {/* Clients Card */}
          <Link href="/dashboard/agent/clients">
            <Card className="p-6 hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer border border-gray-100 rounded-2xl bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal/8 rounded-xl">
                  <Users className="h-6 w-6 text-gold" />
                </div>
              </div>
              <h3 className="text-lg text-midnight mb-1 font-heading">Clients</h3>
              <p className="text-gray-600 text-sm font-body">Gérez vos clients et invitez-en de nouveaux</p>
              <div className="mt-4">
                <Button className="bg-teal hover:bg-teal/90 text-white w-full rounded-xl font-heading">
                  Accéder
                </Button>
              </div>
            </Card>
          </Link>

          {/* Admin Panel Card - Only for admins */}
          {isAdmin && (
            <Link href="/dashboard/agent/settings">
              <Card className="p-6 hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer border border-gray-100 bg-white rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-teal/8 rounded-xl">
                    <Settings className="h-6 w-6 text-teal" />
                  </div>
                </div>
                <h3 className="text-lg text-midnight mb-1 font-heading">Panel Admin</h3>
                <p className="text-gray-600 text-sm font-body">Gérez les paramètres et configurations</p>
                <div className="mt-4">
                  <Button className="bg-teal hover:bg-teal/90 text-white w-full rounded-xl font-heading">
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
