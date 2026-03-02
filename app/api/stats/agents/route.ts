import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AgentKpi {
  agent_id: string
  agent_name: string
  en_cours: number
  termine_ce_mois: number
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { data: agents, error: agentsError } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'agent')
      .order('full_name', { ascending: true })

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: inProgressStudies, error: inProgressError } = await admin
      .from('studies')
      .select('assigned_agent_id')
      .eq('status', 'en_cours')
      .not('assigned_agent_id', 'is', null)

    if (inProgressError) {
      return NextResponse.json({ error: inProgressError.message }, { status: 500 })
    }

    const { data: completedThisMonth, error: completedError } = await admin
      .from('studies')
      .select('assigned_agent_id')
      .eq('status', 'termine')
      .not('assigned_agent_id', 'is', null)
      .gte('completed_at', startOfMonth.toISOString())

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 })
    }

    const inProgressByAgent = new Map<string, number>()
    const completedByAgent = new Map<string, number>()

    for (const row of inProgressStudies || []) {
      if (!row.assigned_agent_id) continue
      inProgressByAgent.set(row.assigned_agent_id, (inProgressByAgent.get(row.assigned_agent_id) || 0) + 1)
    }

    for (const row of completedThisMonth || []) {
      if (!row.assigned_agent_id) continue
      completedByAgent.set(row.assigned_agent_id, (completedByAgent.get(row.assigned_agent_id) || 0) + 1)
    }

    const perAgent: AgentKpi[] = (agents || []).map((agent) => ({
      agent_id: agent.id,
      agent_name: agent.full_name || agent.email || 'Agent',
      en_cours: inProgressByAgent.get(agent.id) || 0,
      termine_ce_mois: completedByAgent.get(agent.id) || 0,
    }))

    return NextResponse.json({ agents: perAgent })
  } catch (err: unknown) {
    console.error('[GET /api/stats/agents]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
