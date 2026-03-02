import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface AgentKpi {
  agent_id: string
  agent_name: string
  en_cours: number
  termine_ce_mois: number
  termine_total: number
  avg_turnaround: number
  last_activity: string | null
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
      .select('assigned_agent_id, updated_at')
      .eq('status', 'en_cours')
      .not('assigned_agent_id', 'is', null)

    if (inProgressError) {
      return NextResponse.json({ error: inProgressError.message }, { status: 500 })
    }

    const { data: completedThisMonth, error: completedError } = await admin
      .from('studies')
      .select('assigned_agent_id, submitted_at, completed_at, updated_at')
      .eq('status', 'termine')
      .not('assigned_agent_id', 'is', null)
      .gte('completed_at', startOfMonth.toISOString())

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 })
    }

    const { data: completedAll, error: completedAllError } = await admin
      .from('studies')
      .select('assigned_agent_id, submitted_at, completed_at, updated_at')
      .eq('status', 'termine')
      .not('assigned_agent_id', 'is', null)

    if (completedAllError) {
      return NextResponse.json({ error: completedAllError.message }, { status: 500 })
    }

    const inProgressByAgent = new Map<string, number>()
    const completedByAgent = new Map<string, number>()
    const completedTotalByAgent = new Map<string, number>()
    const avgByAgent = new Map<string, number>()
    const lastActivityByAgent = new Map<string, string>()

    for (const row of inProgressStudies || []) {
      if (!row.assigned_agent_id) continue
      inProgressByAgent.set(row.assigned_agent_id, (inProgressByAgent.get(row.assigned_agent_id) || 0) + 1)
      if (row.updated_at) {
        const current = lastActivityByAgent.get(row.assigned_agent_id)
        if (!current || new Date(row.updated_at).getTime() > new Date(current).getTime()) {
          lastActivityByAgent.set(row.assigned_agent_id, row.updated_at)
        }
      }
    }

    for (const row of completedThisMonth || []) {
      if (!row.assigned_agent_id) continue
      completedByAgent.set(row.assigned_agent_id, (completedByAgent.get(row.assigned_agent_id) || 0) + 1)
      if (row.updated_at) {
        const current = lastActivityByAgent.get(row.assigned_agent_id)
        if (!current || new Date(row.updated_at).getTime() > new Date(current).getTime()) {
          lastActivityByAgent.set(row.assigned_agent_id, row.updated_at)
        }
      }
    }

    for (const row of completedAll || []) {
      if (!row.assigned_agent_id) continue
      completedTotalByAgent.set(row.assigned_agent_id, (completedTotalByAgent.get(row.assigned_agent_id) || 0) + 1)

      if (row.submitted_at && row.completed_at) {
        const duration = (new Date(row.completed_at).getTime() - new Date(row.submitted_at).getTime()) / (1000 * 60 * 60)
        avgByAgent.set(row.assigned_agent_id, (avgByAgent.get(row.assigned_agent_id) || 0) + duration)
      }

      if (row.updated_at) {
        const current = lastActivityByAgent.get(row.assigned_agent_id)
        if (!current || new Date(row.updated_at).getTime() > new Date(current).getTime()) {
          lastActivityByAgent.set(row.assigned_agent_id, row.updated_at)
        }
      }
    }

    const perAgent: AgentKpi[] = (agents || []).map((agent) => ({
      agent_id: agent.id,
      agent_name: agent.full_name || agent.email || 'Agent',
      en_cours: inProgressByAgent.get(agent.id) || 0,
      termine_ce_mois: completedByAgent.get(agent.id) || 0,
      termine_total: completedTotalByAgent.get(agent.id) || 0,
      avg_turnaround:
        (completedTotalByAgent.get(agent.id) || 0) > 0
          ? Math.round(((avgByAgent.get(agent.id) || 0) / (completedTotalByAgent.get(agent.id) || 1)) * 10) / 10
          : 0,
      last_activity: lastActivityByAgent.get(agent.id) || null,
    }))

    return NextResponse.json({ agents: perAgent })
  } catch (err: unknown) {
    console.error('[GET /api/stats/agents]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
