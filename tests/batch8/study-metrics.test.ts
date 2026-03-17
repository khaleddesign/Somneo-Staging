/**
 * BATCH 8 — Pure metrics computation for agent dashboard
 */
import { describe, it, expect } from 'vitest'
import { computeDelayDays, isStale } from '@/lib/studies/studyMetrics'

describe('computeDelayDays', () => {
  it('retourne null si result_date est null (étude non terminée)', () => {
    expect(computeDelayDays('2026-03-01T00:00:00Z', null)).toBeNull()
  })

  it('retourne null si result_date est undefined', () => {
    expect(computeDelayDays('2026-03-01T00:00:00Z', undefined)).toBeNull()
  })

  it('retourne 0 si result_date === submitted_at (même instant)', () => {
    const ts = '2026-03-01T12:00:00Z'
    expect(computeDelayDays(ts, ts)).toBe(0)
  })

  it('retourne 5 si result_date est 5 jours après submitted_at', () => {
    expect(
      computeDelayDays('2026-03-01T00:00:00Z', '2026-03-06T00:00:00Z')
    ).toBe(5)
  })

  it('retourne un entier (floor des jours fractionnaires)', () => {
    // 1.5 days → 1
    expect(
      computeDelayDays('2026-03-01T00:00:00Z', '2026-03-02T12:00:00Z')
    ).toBe(1)
  })

  it('retourne positif même si les dates sont inversées (défensif)', () => {
    const result = computeDelayDays('2026-03-06T00:00:00Z', '2026-03-01T00:00:00Z')
    expect(result).toBeGreaterThanOrEqual(0)
  })
})

describe('isStale', () => {
  it('false si status !== "en_cours" (quelle que soit la date)', () => {
    const oldDate = new Date(Date.now() - 100 * 3600 * 1000).toISOString()
    expect(isStale(oldDate, 'en_attente')).toBe(false)
    expect(isStale(oldDate, 'termine')).toBe(false)
    expect(isStale(oldDate, 'annule')).toBe(false)
  })

  it('false si en_cours mais updated_at dans les 48h', () => {
    const recentDate = new Date(Date.now() - 10 * 3600 * 1000).toISOString()
    expect(isStale(recentDate, 'en_cours')).toBe(false)
  })

  it('true si en_cours et updated_at > 48h', () => {
    const oldDate = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    expect(isStale(oldDate, 'en_cours')).toBe(true)
  })

  it('respecte le thresholdHours custom', () => {
    const date25hAgo = new Date(Date.now() - 25 * 3600 * 1000).toISOString()
    // 24h threshold → stale
    expect(isStale(date25hAgo, 'en_cours', 24)).toBe(true)
    // 48h threshold (default) → not stale
    expect(isStale(date25hAgo, 'en_cours', 48)).toBe(false)
  })

  it('false exactement à la limite du seuil (boundary)', () => {
    // exactly 48h → not stale (strict >)
    const exactly48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    expect(isStale(exactly48h, 'en_cours')).toBe(false)
  })
})
