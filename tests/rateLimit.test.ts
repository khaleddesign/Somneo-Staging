/**
 * BATCH 1 — Tâche 1.1 : Rate limiting (in-memory fallback)
 *
 * Ces tests couvrent le comportement de memCheck via l'API publique `limiters`.
 * En environnement de test (sans UPSTASH_REDIS_REST_URL), le fallback in-memory est utilisé.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { limiters } from '@/lib/rateLimit'

// Chaque test utilise une clé unique pour éviter les interférences entre tests
function uniqueKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

describe('Rate limiting — in-memory fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Test 1 : 5 appels OK → 6ème bloqué ─────────────────────────────────────
  it('autorise les 5 premiers appels et bloque le 6ème (signup : 5/15min)', async () => {
    const key = uniqueKey('signup-ip')

    const results: boolean[] = []
    for (let i = 0; i < 6; i++) {
      const r = await limiters.signup.check(key)
      results.push(r.allowed)
    }

    expect(results.slice(0, 5)).toEqual([true, true, true, true, true])
    expect(results[5]).toBe(false)
  })

  it('retourne les headers corrects sur un appel bloqué', async () => {
    const key = uniqueKey('signup-headers')

    // Épuiser la limite
    for (let i = 0; i < 5; i++) {
      await limiters.signup.check(key)
    }

    const blocked = await limiters.signup.check(key)
    expect(blocked.allowed).toBe(false)
    expect(blocked.headers['X-RateLimit-Limit']).toBe('5')
    expect(blocked.headers['X-RateLimit-Remaining']).toBe('0')
    expect(blocked.headers['Retry-After']).toBeDefined()
    const retryAfter = parseInt(blocked.headers['Retry-After'] ?? '0', 10)
    expect(retryAfter).toBeGreaterThan(0)
  })

  // ── Test 2 : reset du compteur après windowMs ────────────────────────────────
  it('réinitialise le compteur après expiration de la fenêtre (15 min)', async () => {
    const key = uniqueKey('signup-reset')

    // Épuiser la limite
    for (let i = 0; i < 5; i++) {
      await limiters.signup.check(key)
    }
    expect((await limiters.signup.check(key)).allowed).toBe(false)

    // Avancer le temps de 15 min + 1 ms
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)

    // Le compteur doit être réinitialisé
    const afterReset = await limiters.signup.check(key)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.headers['X-RateLimit-Remaining']).toBe('4')
  })

  // ── Test 3 : clés différentes sont indépendantes ─────────────────────────────
  it('des IPs différentes ont des compteurs indépendants', async () => {
    const keyA = uniqueKey('ip-A')
    const keyB = uniqueKey('ip-B')

    // Épuiser la limite pour keyA
    for (let i = 0; i < 5; i++) {
      await limiters.signup.check(keyA)
    }
    expect((await limiters.signup.check(keyA)).allowed).toBe(false)

    // keyB ne doit pas être affecté
    const resultB = await limiters.signup.check(keyB)
    expect(resultB.allowed).toBe(true)
    expect(resultB.headers['X-RateLimit-Remaining']).toBe('4')
  })

  // ── Test 4 : limiters différents sont indépendants ───────────────────────────
  it('les limiteurs signup et comment sont indépendants', async () => {
    const key = uniqueKey('shared-key')

    // Épuiser signup (5/15m)
    for (let i = 0; i < 5; i++) {
      await limiters.signup.check(key)
    }
    expect((await limiters.signup.check(key)).allowed).toBe(false)

    // comment (30/1m) ne doit pas être affecté
    const commentResult = await limiters.comment.check(key)
    expect(commentResult.allowed).toBe(true)
  })

  // ── Test 5 : forgotPassword — 3 tentatives max ───────────────────────────────
  it('bloque la 4ème tentative de forgot-password (3/15min)', async () => {
    const key = uniqueKey('forgot-ip')

    for (let i = 0; i < 3; i++) {
      const r = await limiters.forgotPassword.check(key)
      expect(r.allowed).toBe(true)
    }

    const blocked = await limiters.forgotPassword.check(key)
    expect(blocked.allowed).toBe(false)
  })
})
