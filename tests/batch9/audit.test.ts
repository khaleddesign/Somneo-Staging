/**
 * BATCH 9 — Audit trail for cross-client study access
 */
import { describe, it, expect } from 'vitest'
import { shouldAuditAccess } from '@/lib/studies/scopeFilter'
import { buildAuditEntry } from '@/lib/audit'

// Re-test shouldAuditAccess for isolation (already tested in batch6)
describe('shouldAuditAccess', () => {
  it('true quand requesterId ≠ studyOwnerId', () => {
    expect(shouldAuditAccess('user-a', 'user-b')).toBe(true)
  })
  it('false quand requesterId === studyOwnerId', () => {
    expect(shouldAuditAccess('user-a', 'user-a')).toBe(false)
  })
  it('false quand studyOwnerId est null', () => {
    expect(shouldAuditAccess('user-a', null)).toBe(false)
  })
})

describe('buildAuditEntry', () => {
  it('action = "cross_client_read"', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    expect(entry.action).toBe('cross_client_read')
  })

  it('resource_type = "study"', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    expect(entry.resource_type).toBe('study')
  })

  it('resource_id = studyId passé', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    expect(entry.resource_id).toBe('study-123')
  })

  it('metadata contient owner_id', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    expect(entry.metadata.owner_id).toBe('owner-456')
  })

  it('patient_reference ABSENT de l entrée (PHI guard)', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    expect('patient_reference' in entry).toBe(false)
    expect('patient_reference' in entry.metadata).toBe(false)
  })

  it('aucune donnée patient dans metadata (PHI guard)', () => {
    const entry = buildAuditEntry('study-123', 'owner-456')
    const keys = Object.keys(entry.metadata)
    expect(keys).not.toContain('patient_reference')
    expect(keys).not.toContain('patient_name')
    expect(keys).not.toContain('email')
  })
})
