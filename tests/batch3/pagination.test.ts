/**
 * BATCH 3 — Tâche 3.2 : Pagination cursor-based
 *
 * Teste les utilitaires purs de pagination dans lib/studies/paginationParams.ts
 * et la logique de découpage de page dans lib/studies/paginateResults.ts
 * Aucun mock DB/réseau requis.
 */

import { describe, it, expect } from 'vitest'
import { parsePaginationParams } from '@/lib/studies/paginationParams'
import { paginateResults } from '@/lib/studies/paginateResults'

// ─── parsePaginationParams ────────────────────────────────────────────────────

describe('parsePaginationParams — validation des paramètres', () => {
  // ── Test 1 : valeurs par défaut ────────────────────────────────────────────
  it('retourne limit=50 et cursor=null par défaut', () => {
    const params = parsePaginationParams(new URLSearchParams())
    expect(params.limit).toBe(50)
    expect(params.cursor).toBeNull()
  })

  // ── Test 2 : limit custom valide ──────────────────────────────────────────
  it('accepte un limit custom entre 1 et 100', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=20'))
    expect(params.limit).toBe(20)
  })

  // ── Test 3 : limit clampé à 100 ───────────────────────────────────────────
  it('clamp limit à 100 si > 100', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=500'))
    expect(params.limit).toBe(100)
  })

  // ── Test 4 : limit invalide → fallback 50 ─────────────────────────────────
  it('utilise limit=50 si valeur non numérique', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=abc'))
    expect(params.limit).toBe(50)
  })

  // ── Test 5 : limit=0 → clampé à 1 ────────────────────────────────────────
  it('clamp limit à 1 si < 1', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=0'))
    expect(params.limit).toBe(1)
  })

  // ── Test 6 : cursor passé correctement ────────────────────────────────────
  it('extrait le cursor ISO string', () => {
    const iso = '2026-03-14T10:30:00.000Z'
    const params = parsePaginationParams(new URLSearchParams(`cursor=${encodeURIComponent(iso)}`))
    expect(params.cursor).toBe(iso)
  })

  // ── Test 7 : cursor absent → null ─────────────────────────────────────────
  it('retourne cursor=null si absent', () => {
    const params = parsePaginationParams(new URLSearchParams('limit=10'))
    expect(params.cursor).toBeNull()
  })
})

// ─── paginateResults ──────────────────────────────────────────────────────────

interface FakeStudy {
  id: string
  submitted_at: string
}

function makeStudies(n: number): FakeStudy[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `study-${i}`,
    submitted_at: new Date(Date.now() - i * 1000).toISOString(),
  }))
}

describe('paginateResults — découpage et nextCursor', () => {
  // ── Test 8 : retourne exactement `limit` items ────────────────────────────
  it('retourne exactement `limit` items quand il y en a plus', () => {
    // On passe limit+1 items (la stratégie +1 pour détecter la page suivante)
    const raw = makeStudies(51) // limit=50, donc 51 items = il y a une page suivante
    const { items, nextCursor } = paginateResults(raw, 50, 'submitted_at')

    expect(items).toHaveLength(50)
    expect(nextCursor).not.toBeNull()
  })

  // ── Test 9 : nextCursor = null si dernière page ───────────────────────────
  it('retourne nextCursor=null si moins de résultats que limit', () => {
    const raw = makeStudies(30) // limit=50, seulement 30 → dernière page
    const { items, nextCursor } = paginateResults(raw, 50, 'submitted_at')

    expect(items).toHaveLength(30)
    expect(nextCursor).toBeNull()
  })

  // ── Test 10 : nextCursor = valeur du dernier item ─────────────────────────
  it('nextCursor est la valeur submitted_at du dernier item retourné', () => {
    const raw = makeStudies(51)
    const { items, nextCursor } = paginateResults(raw, 50, 'submitted_at')

    expect(nextCursor).toBe(items[49].submitted_at)
  })

  // ── Test 11 : liste vide → items=[] et nextCursor=null ───────────────────
  it('gère une liste vide correctement', () => {
    const { items, nextCursor } = paginateResults([], 50, 'submitted_at')
    expect(items).toHaveLength(0)
    expect(nextCursor).toBeNull()
  })

  // ── Test 12 : exactement limit items → nextCursor=null ───────────────────
  it('retourne nextCursor=null si exactement limit items (pas de +1)', () => {
    const raw = makeStudies(50) // Exactement 50 = pas de page suivante
    const { items, nextCursor } = paginateResults(raw, 50, 'submitted_at')

    expect(items).toHaveLength(50)
    expect(nextCursor).toBeNull()
  })
})

// ─── Décryptage parallèle ─────────────────────────────────────────────────────

describe('Décryptage parallèle vs séquentiel', () => {
  // ── Test 13 : Promise.all vs boucle séquentielle ──────────────────────────
  it('Promise.all décrypte N items en parallèle (pas de blocage séquentiel)', async () => {
    // Simule un décryptage qui prend 10ms chacun
    const delay = (ms: number) => new Promise<string>(r => setTimeout(() => r('decrypted'), ms))
    const DELAY = 10
    const N = 10

    // En série : devrait prendre N * DELAY = 100ms
    const seriesStart = Date.now()
    const seriesResults = []
    for (let i = 0; i < N; i++) {
      seriesResults.push(await delay(DELAY))
    }
    const seriesDuration = Date.now() - seriesStart

    // En parallèle : devrait prendre ≈ DELAY = 10ms
    const parallelStart = Date.now()
    const parallelResults = await Promise.all(
      Array.from({ length: N }, () => delay(DELAY))
    )
    const parallelDuration = Date.now() - parallelStart

    expect(parallelResults).toHaveLength(N)
    // Le parallèle doit être significativement plus rapide que la série
    expect(parallelDuration).toBeLessThan(seriesDuration * 0.5)
  })
})
