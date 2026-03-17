/**
 * BATCH 7 — Tests useStudies scope param URL construction
 * Uses vi.spyOn on globalThis.fetch to capture URLs without network calls
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test the URL that useStudies builds by checking fetch call args
// Since useStudies is a React hook, we test the URL building logic separately
// via a pure helper extracted from it

import { buildStudiesUrl } from '@/lib/studies/studiesUrlBuilder'

describe('buildStudiesUrl', () => {
  it('pas de ?scope= dans l URL si appelé sans scope (backward compat)', () => {
    const url = buildStudiesUrl({ limit: 100 })
    expect(url).not.toContain('scope=')
  })

  it('?scope=mine dans l URL si scope="mine"', () => {
    const url = buildStudiesUrl({ limit: 100, scope: 'mine' })
    expect(url).toContain('scope=mine')
  })

  it('?scope=institution dans l URL si scope="institution"', () => {
    const url = buildStudiesUrl({ limit: 100, scope: 'institution' })
    expect(url).toContain('scope=institution')
  })

  it('?limit= et ?scope= coexistent dans l URL', () => {
    const url = buildStudiesUrl({ limit: 20, scope: 'institution' })
    expect(url).toContain('limit=20')
    expect(url).toContain('scope=institution')
  })

  it('?cursor= et ?scope= coexistent si cursor défini', () => {
    const url = buildStudiesUrl({ limit: 50, scope: 'mine', cursor: '2026-03-14T10:30:00.000Z' })
    expect(url).toContain('cursor=')
    expect(url).toContain('scope=mine')
  })

  it('cursor absent → pas de ?cursor= dans l URL', () => {
    const url = buildStudiesUrl({ limit: 50, scope: 'institution' })
    expect(url).not.toContain('cursor=')
  })
})
