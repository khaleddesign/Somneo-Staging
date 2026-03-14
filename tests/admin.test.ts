import { describe, expect, it } from 'vitest'

type StudyStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'

type StudyRow = {
  id: string
  assigned_agent_id: string | null
  status: StudyStatus
  submitted_at: string
  completed_at: string | null
}

type AgentProfile = {
  id: string
  full_name: string
}

function computeGlobalKpis(studies: StudyRow[], totalAgents: number, totalClients: number) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const termineCeMois = studies.filter((study) => {
    if (!study.completed_at || study.status !== 'termine') return false
    const completed = new Date(study.completed_at)
    return completed.getMonth() === currentMonth && completed.getFullYear() === currentYear
  }).length

  return {
    total_agents: totalAgents,
    total_clients: totalClients,
    total_studies: studies.length,
    en_attente_non_assignees: studies.filter((s) => s.status === 'en_attente' && !s.assigned_agent_id).length,
    en_cours: studies.filter((s) => s.status === 'en_cours').length,
    termine_ce_mois: termineCeMois,
  }
}

function computePerformanceByAgent(agents: AgentProfile[], studies: StudyRow[]) {
  return agents.map((agent) => {
    const mine = studies.filter((s) => s.assigned_agent_id === agent.id)
    const inProgress = mine.filter((s) => s.status === 'en_cours').length
    const done = mine.filter((s) => s.status === 'termine' && s.completed_at)

    const avgTurnaroundHours =
      done.length === 0
        ? 0
        : Math.round(
            done.reduce((sum, study) => {
              const submitted = new Date(study.submitted_at).getTime()
              const completed = new Date(study.completed_at as string).getTime()
              return sum + (completed - submitted) / (1000 * 60 * 60)
            }, 0) / done.length,
          )

    return {
      agent_id: agent.id,
      agent_name: agent.full_name,
      en_cours: inProgress,
      termine_total: done.length,
      avg_turnaround: avgTurnaroundHours,
    }
  })
}

function toggleSuspension(current: boolean, actorRole: 'admin' | 'agent' | 'client') {
  if (actorRole !== 'admin') {
    throw new Error('Access denied')
  }
  return !current
}

describe('Admin KPIs and controls', () => {
  it('calcule les KPIs globaux', () => {
    const studies: StudyRow[] = [
      { id: '1', assigned_agent_id: null, status: 'en_attente', submitted_at: '2026-03-01T10:00:00.000Z', completed_at: null },
      { id: '2', assigned_agent_id: 'a1', status: 'en_cours', submitted_at: '2026-03-01T12:00:00.000Z', completed_at: null },
      { id: '3', assigned_agent_id: 'a1', status: 'termine', submitted_at: '2026-03-02T08:00:00.000Z', completed_at: '2026-03-02T18:00:00.000Z' },
    ]

    const kpis = computeGlobalKpis(studies, 2, 5)

    expect(kpis.total_agents).toBe(2)
    expect(kpis.total_clients).toBe(5)
    expect(kpis.total_studies).toBe(3)
    expect(kpis.en_attente_non_assignees).toBe(1)
    expect(kpis.en_cours).toBe(1)
    expect(kpis.termine_ce_mois).toBeGreaterThanOrEqual(1)
  })

  it('calcule la performance par agent', () => {
    const agents: AgentProfile[] = [{ id: 'a1', full_name: 'Agent 1' }]
    const studies: StudyRow[] = [
      { id: '1', assigned_agent_id: 'a1', status: 'en_cours', submitted_at: '2026-03-01T10:00:00.000Z', completed_at: null },
      { id: '2', assigned_agent_id: 'a1', status: 'termine', submitted_at: '2026-03-01T10:00:00.000Z', completed_at: '2026-03-01T20:00:00.000Z' },
    ]

    const performance = computePerformanceByAgent(agents, studies)

    expect(performance[0].en_cours).toBe(1)
    expect(performance[0].termine_total).toBe(1)
    expect(performance[0].avg_turnaround).toBe(10)
  })

  it('applique la logique de suspension de compte', () => {
    expect(toggleSuspension(false, 'admin')).toBe(true)
    expect(toggleSuspension(true, 'admin')).toBe(false)
    expect(() => toggleSuspension(false, 'agent')).toThrowError('Access denied')
  })
})
