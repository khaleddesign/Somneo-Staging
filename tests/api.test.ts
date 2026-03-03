import { describe, expect, it } from 'vitest'
import { computeMd5 } from '../lib/utils'

type StudyStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'
type Priority = 'low' | 'medium' | 'high'

type TestStudy = {
  assigned_agent_id: string | null
  status: StudyStatus
  priority: Priority
}

function isInvitationEmailValid(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

function canAgentUpdateStudy(params: {
  study: TestStudy
  currentUserId: string
  isAdmin: boolean
}): boolean {
  const { study, currentUserId, isAdmin } = params
  if (isAdmin) return true
  return study.assigned_agent_id === null || study.assigned_agent_id === currentUserId
}

function computeDashboardStats(studies: TestStudy[]) {
  return {
    total: studies.length,
    enAttente: studies.filter((study) => study.status === 'en_attente').length,
    enCours: studies.filter((study) => study.status === 'en_cours').length,
    termine: studies.filter((study) => study.status === 'termine').length,
  }
}

describe('API/business quick checks', () => {
  it('calcule un checksum MD5 stable', () => {
    expect(computeMd5('somnoconnect')).toBe('bf69a5a032faa220f6daee6039f20fe8')
  })

  it('valide correctement un email invitation', () => {
    expect(isInvitationEmailValid('client@clinic.fr')).toBe(true)
    expect(isInvitationEmailValid('CLIENT@CLINIC.FR')).toBe(true)
    expect(isInvitationEmailValid('invalid-email')).toBe(false)
    expect(isInvitationEmailValid('bad@domain')).toBe(false)
  })

  it('applique la logique assignation étude (pool ou assignée)', () => {
    const agentId = 'agent-1'
    expect(
      canAgentUpdateStudy({
        study: { assigned_agent_id: null, status: 'en_attente', priority: 'high' },
        currentUserId: agentId,
        isAdmin: false,
      }),
    ).toBe(true)

    expect(
      canAgentUpdateStudy({
        study: { assigned_agent_id: 'agent-1', status: 'en_cours', priority: 'medium' },
        currentUserId: agentId,
        isAdmin: false,
      }),
    ).toBe(true)

    expect(
      canAgentUpdateStudy({
        study: { assigned_agent_id: 'agent-2', status: 'en_cours', priority: 'medium' },
        currentUserId: agentId,
        isAdmin: false,
      }),
    ).toBe(false)

    expect(
      canAgentUpdateStudy({
        study: { assigned_agent_id: 'agent-2', status: 'en_cours', priority: 'medium' },
        currentUserId: agentId,
        isAdmin: true,
      }),
    ).toBe(true)
  })

  it('calcule les stats dashboard', () => {
    const stats = computeDashboardStats([
      { assigned_agent_id: null, status: 'en_attente', priority: 'high' },
      { assigned_agent_id: 'a1', status: 'en_cours', priority: 'medium' },
      { assigned_agent_id: 'a1', status: 'termine', priority: 'low' },
      { assigned_agent_id: 'a2', status: 'termine', priority: 'medium' },
    ])

    expect(stats).toEqual({
      total: 4,
      enAttente: 1,
      enCours: 1,
      termine: 2,
    })
  })
})
