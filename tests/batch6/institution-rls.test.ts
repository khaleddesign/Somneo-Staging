import { describe, it, expect } from 'vitest'
import { parseScopeParam, buildClientScopeFilter, shouldAuditAccess } from '@/lib/studies/scopeFilter'

describe('parseScopeParam', () => {
  it('retourne "mine" par défaut si param absent', () => {
    expect(parseScopeParam(null)).toBe('mine')
  })
  it('retourne "institution" si scope=institution', () => {
    expect(parseScopeParam('institution')).toBe('institution')
  })
  it('retourne "mine" pour toute valeur inconnue (default sécurisé)', () => {
    expect(parseScopeParam('hack')).toBe('mine')
    expect(parseScopeParam('')).toBe('mine')
  })
  it('retourne "mine" si scope=mine explicite', () => {
    expect(parseScopeParam('mine')).toBe('mine')
  })
})

describe('buildClientScopeFilter', () => {
  it('scope="mine" → applyClientIdFilter=true', () => {
    const d = buildClientScopeFilter('mine', 'user-123')
    expect(d.applyClientIdFilter).toBe(true)
  })
  it('scope="institution" → applyClientIdFilter=false', () => {
    const d = buildClientScopeFilter('institution', 'user-123')
    expect(d.applyClientIdFilter).toBe(false)
  })
  it('descriptor.userId correspond au userId passé', () => {
    const d = buildClientScopeFilter('mine', 'user-abc')
    expect(d.userId).toBe('user-abc')
  })
  it('descriptor.scope correspond au scope passé', () => {
    const d = buildClientScopeFilter('institution', 'user-123')
    expect(d.scope).toBe('institution')
  })
})

describe('shouldAuditAccess', () => {
  it('true quand requesterId ≠ studyOwnerId (accès cross-client)', () => {
    expect(shouldAuditAccess('user-a', 'user-b')).toBe(true)
  })
  it('false quand requesterId === studyOwnerId (accès propre étude)', () => {
    expect(shouldAuditAccess('user-a', 'user-a')).toBe(false)
  })
  it('false quand studyOwnerId est null (chemin agent/admin)', () => {
    expect(shouldAuditAccess('user-a', null)).toBe(false)
  })
})
