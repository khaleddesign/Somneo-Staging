import { describe, expect, it } from 'vitest'
import { computeMd5 } from '../lib/utils'

type StudyStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'

type Study = {
  id: string
  assigned_agent_id: string | null
  status: StudyStatus
}

function assignStudy(study: Study, agentId: string): Study {
  if (study.assigned_agent_id) {
    throw new Error('Cette étude est déjà assignée')
  }

  return {
    ...study,
    assigned_agent_id: agentId,
    status: 'en_cours',
  }
}

function canTransitionStatus(from: StudyStatus, to: StudyStatus): boolean {
  const allowedTransitions: Record<StudyStatus, StudyStatus[]> = {
    en_attente: ['en_cours', 'annule'],
    en_cours: ['termine', 'annule'],
    termine: [],
    annule: [],
  }

  return allowedTransitions[from].includes(to)
}

function validateEdfFile(params: { filename: string; size: number; maxSizeMb?: number }) {
  const maxSizeBytes = (params.maxSizeMb ?? 200) * 1024 * 1024
  const lower = params.filename.toLowerCase()

  if (!lower.endsWith('.edf')) {
    return { valid: false, reason: 'extension' as const }
  }

  if (params.size <= 0 || params.size > maxSizeBytes) {
    return { valid: false, reason: 'size' as const }
  }

  return { valid: true as const }
}

describe('Studies domain', () => {
  it('applique la logique d\'assignation étude', () => {
    const study: Study = { id: 's1', assigned_agent_id: null, status: 'en_attente' }
    const assigned = assignStudy(study, 'agent-1')

    expect(assigned.assigned_agent_id).toBe('agent-1')
    expect(assigned.status).toBe('en_cours')

    expect(() => assignStudy(assigned, 'agent-2')).toThrowError('Cette étude est déjà assignée')
  })

  it('valide les transitions de statut en_attente → en_cours → termine', () => {
    expect(canTransitionStatus('en_attente', 'en_cours')).toBe(true)
    expect(canTransitionStatus('en_cours', 'termine')).toBe(true)
    expect(canTransitionStatus('termine', 'en_cours')).toBe(false)
  })

  it('calcule un checksum MD5 stable', () => {
    expect(computeMd5('study-file-content')).toBe('9a202f6adb82751048b6df43b29b8b57')
  })

  it('valide un fichier EDF (taille + extension)', () => {
    expect(validateEdfFile({ filename: 'patient_001.edf', size: 50 * 1024 * 1024 }).valid).toBe(true)
    expect(validateEdfFile({ filename: 'patient_001.pdf', size: 1024 }).valid).toBe(false)
    expect(validateEdfFile({ filename: 'patient_001.edf', size: 0 }).valid).toBe(false)
    expect(validateEdfFile({ filename: 'patient_001.edf', size: 250 * 1024 * 1024 }).valid).toBe(false)
  })
})
