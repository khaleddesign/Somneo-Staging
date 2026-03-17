/**
 * BATCH 2 — Tâche 2.1 : Retry strategy avec backoff exponentiel
 *
 * Teste lib/utils/retry.ts — fonction pure, aucun mock réseau requis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff } from '@/lib/utils/retry'

describe('retryWithBackoff — comportement de base', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // ── Test 1 : succès immédiat, pas de retry ────────────────────────────────
  it('retourne le résultat sans retry si fn() réussit du premier coup', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'ok' })

    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1000 })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'ok' })
  })

  // ── Test 2 : retry 3x sur erreur 5xx avec backoff exponentiel ─────────────
  it('retente 3 fois sur erreur 5xx avec backoff exponentiel (1s → 2s → 4s)', async () => {
    const sleepCalls: number[] = []
    const mockSleep = vi.fn((ms: number) => {
      sleepCalls.push(ms)
      return Promise.resolve()
    })

    let attempts = 0
    const fn = vi.fn(async () => {
      attempts++
      if (attempts <= 3) throw Object.assign(new Error('Service unavailable'), { status: 503 })
      return { id: 'success-after-retry' }
    })

    const result = await retryWithBackoff(fn, {
      maxAttempts: 4,
      baseDelayMs: 1000,
      _sleep: mockSleep,
    })

    expect(fn).toHaveBeenCalledTimes(4)
    expect(sleepCalls).toEqual([1000, 2000, 4000])
    expect(result).toEqual({ id: 'success-after-retry' })
  })

  // ── Test 3 : pas de retry sur erreur 4xx ─────────────────────────────────
  it('ne retente PAS sur erreur 4xx (erreur client)', async () => {
    const mockSleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('Bad Request'), { status: 400 })
    })

    await expect(
      retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1000, _sleep: mockSleep })
    ).rejects.toMatchObject({ status: 400 })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(mockSleep).not.toHaveBeenCalled()
  })

  // ── Test 4 : pas de retry sur erreur 401 ─────────────────────────────────
  it('ne retente PAS sur erreur 401 (non autorisé)', async () => {
    const mockSleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('Unauthorized'), { status: 401 })
    })

    await expect(
      retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 1000, _sleep: mockSleep })
    ).rejects.toMatchObject({ status: 401 })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  // ── Test 5 : exhauste les tentatives et throw la dernière erreur ──────────
  it('throw après maxAttempts tentatives échouées', async () => {
    const mockSleep = vi.fn().mockResolvedValue(undefined)
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('Gateway Timeout'), { status: 504 })
    })

    await expect(
      retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 500, _sleep: mockSleep })
    ).rejects.toMatchObject({ status: 504 })

    expect(fn).toHaveBeenCalledTimes(3)
    expect(mockSleep).toHaveBeenCalledTimes(2) // 3 tentatives = 2 délais entre elles
  })

  // ── Test 6 : erreur sans status (réseau / CORS) → retry ──────────────────
  it('retente sur erreur sans status (TypeError réseau)', async () => {
    const mockSleep = vi.fn().mockResolvedValue(undefined)
    let calls = 0
    const fn = vi.fn(async () => {
      if (++calls < 3) throw new TypeError('Failed to fetch')
      return 'recovered'
    })

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      _sleep: mockSleep,
    })

    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  // ── Test 7 : maxAttempts = 1 → aucun retry ───────────────────────────────
  it('ne retente pas si maxAttempts = 1', async () => {
    const mockSleep = vi.fn()
    const fn = vi.fn(async () => {
      throw Object.assign(new Error('Error'), { status: 500 })
    })

    await expect(
      retryWithBackoff(fn, { maxAttempts: 1, baseDelayMs: 1000, _sleep: mockSleep })
    ).rejects.toBeDefined()

    expect(fn).toHaveBeenCalledTimes(1)
    expect(mockSleep).not.toHaveBeenCalled()
  })
})
