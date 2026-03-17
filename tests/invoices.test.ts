/**
 * BATCH 1 — Tâche 1.3 : Idempotency sur POST /api/invoices
 *
 * Teste la logique d'idempotency isolée dans lib/idempotency.ts.
 * Pas de dépendances Supabase/Next.js — fonction pure avec store injecté.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withIdempotency, type IdempotencyStore } from '@/lib/idempotency'

// ── Store in-memory pour les tests ──────────────────────────────────────────
function makeMemoryStore(): IdempotencyStore {
  const store = new Map<string, { response: unknown; status: number; createdAt: number }>()
  return {
    async get(key) {
      const entry = store.get(key)
      if (!entry) return null
      // TTL: 24h
      if (Date.now() - entry.createdAt > 24 * 60 * 60 * 1000) {
        store.delete(key)
        return null
      }
      return { response: entry.response, status: entry.status }
    },
    async set(key, response, status) {
      store.set(key, { response, status, createdAt: Date.now() })
    },
  }
}

describe('withIdempotency — comportement de base', () => {
  let memStore: IdempotencyStore

  beforeEach(() => {
    memStore = makeMemoryStore()
  })

  // ── Test 1 : 2 appels identiques → 1 seule exécution ────────────────────
  it('n\'exécute fn() qu\'une seule fois pour la même clé', async () => {
    const fn = vi.fn().mockResolvedValue({ id: 'invoice-abc', amount: 200 })
    const key = 'idem-key-001'

    const result1 = await withIdempotency(key, fn, memStore)
    const result2 = await withIdempotency(key, fn, memStore)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result1.data).toEqual({ id: 'invoice-abc', amount: 200 })
    expect(result2.data).toEqual({ id: 'invoice-abc', amount: 200 })
    expect(result1.cached).toBe(false)
    expect(result2.cached).toBe(true)
  })

  // ── Test 2 : clés différentes → exécutions indépendantes ────────────────
  it('exécute fn() pour chaque clé distincte', async () => {
    let counter = 0
    const fn = vi.fn().mockImplementation(async () => ({ id: `inv-${++counter}` }))

    await withIdempotency('key-A', fn, memStore)
    await withIdempotency('key-B', fn, memStore)

    expect(fn).toHaveBeenCalledTimes(2)
  })

  // ── Test 3 : résultat mis en cache correctement ──────────────────────────
  it('retourne exactement le même objet lors du 2ème appel (deep equal)', async () => {
    const expected = { id: 'inv-xyz', invoice_number: 'FAC-2026-0001', total_ttc: 350.5 }
    const fn = vi.fn().mockResolvedValue(expected)
    const key = 'idem-key-003'

    const r1 = await withIdempotency(key, fn, memStore)
    const r2 = await withIdempotency(key, fn, memStore)

    expect(r2.data).toEqual(expected)
    expect(r2.cached).toBe(true)
  })

  // ── Test 4 : si fn() throw, l'erreur n'est pas mise en cache ───────────
  it('ne met pas en cache une erreur — fn() peut être re-tenté', async () => {
    let callCount = 0
    const fn = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) throw new Error('DB timeout')
      return { id: 'inv-retry' }
    })

    const key = 'idem-key-004'

    // Premier appel → throw
    await expect(withIdempotency(key, fn, memStore)).rejects.toThrow('DB timeout')

    // Deuxième appel avec même clé → doit re-exécuter fn() et réussir
    const result = await withIdempotency(key, fn, memStore)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.cached).toBe(false)
    expect(result.data).toEqual({ id: 'inv-retry' })
  })

  // ── Test 5 : TTL expiré → re-exécution ───────────────────────────────────
  it('re-exécute fn() après expiration du TTL', async () => {
    vi.useFakeTimers()

    const fn = vi.fn().mockResolvedValue({ id: 'inv-fresh' })
    const key = 'idem-key-005'

    await withIdempotency(key, fn, memStore)
    expect(fn).toHaveBeenCalledTimes(1)

    // Avancer le temps de 25h (TTL = 24h)
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)

    await withIdempotency(key, fn, memStore)
    expect(fn).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })
})

describe('withIdempotency — validation de la clé', () => {
  it('throw si la clé est une chaîne vide', async () => {
    const fn = vi.fn()
    const store = makeMemoryStore()
    await expect(withIdempotency('', fn, store)).rejects.toThrow(/Idempotency key/)
  })

  it('throw si la clé est trop longue (> 256 chars)', async () => {
    const fn = vi.fn()
    const store = makeMemoryStore()
    const longKey = 'x'.repeat(257)
    await expect(withIdempotency(longKey, fn, store)).rejects.toThrow(/Idempotency key/)
  })
})
