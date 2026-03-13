'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AppLayout from '@/components/custom/AppLayout'
import AgentStats from '@/components/custom/AgentStats'
import { Card } from '@/components/ui/card'

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
      <div className="p-8 bg-[#f0f4f8] min-h-screen">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl text-midnight font-display">
            Bonjour, {agentName}
          </h1>
          <p className="text-gray-500 mt-1 font-body text-sm">Tableau de bord SomnoConnect</p>
        </div>

        {/* KPIs */}
        <AgentStats />

        {/* Admin: KPI par agent */}
        {isAdmin && (
          <Card className="p-6">
            <h2 className="text-base text-midnight mb-4 font-heading">
              Activité par agent
            </h2>
            {loadingAgentKpis ? (
              <p className="text-sm text-gray-400">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400 text-xs uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-heading">Agent</th>
                      <th className="pb-3 pr-4 font-heading">En cours</th>
                      <th className="pb-3 font-heading">Terminées ce mois</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {agentKpis.map((row) => (
                      <tr key={row.agent_id}>
                        <td className="py-3 pr-4 text-midnight font-medium">{row.agent_name}</td>
                        <td className="py-3 pr-4 text-gray-600">{row.en_cours}</td>
                        <td className="py-3 text-gray-600">{row.termine_ce_mois}</td>
                      </tr>
                    ))}
                    {agentKpis.length === 0 && (
                      <tr>
                        <td className="py-4 text-gray-400" colSpan={3}>
                          Aucun agent trouvé.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
