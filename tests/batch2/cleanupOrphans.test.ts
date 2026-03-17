/**
 * BATCH 2 — Tâche 2.3 : Cron cleanup-orphans
 *
 * Teste la logique d'extraction des orphelins dans lib/cron/findOrphanFiles.ts.
 * Pas de vraie DB — logique pure sur des données mockées.
 */

import { describe, it, expect } from 'vitest'
import { findOrphanPaths } from '@/lib/cron/findOrphanFiles'

describe('findOrphanPaths — détection des fichiers orphelins', () => {
  const now = new Date()
  const ago25h = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
  const ago10h = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString()

  // ── Test 1 : fichier dans le bucket sans étude correspondante ─────────────
  it('détecte un fichier sans étude liée comme orphelin', () => {
    const bucketObjects = [
      { name: 'user-uuid/user-uuid-111.edf', created_at: ago25h },
    ]
    const studyFilePaths: string[] = [] // aucune étude n'a ce path

    const orphans = findOrphanPaths(bucketObjects, studyFilePaths, 24)
    expect(orphans).toContain('user-uuid/user-uuid-111.edf')
  })

  // ── Test 2 : fichier récent (< TTL) → pas orphelin ────────────────────────
  it('ne marque pas comme orphelin un fichier de moins de 24h', () => {
    const bucketObjects = [
      { name: 'user-uuid/user-uuid-new.edf', created_at: ago10h },
    ]
    const orphans = findOrphanPaths(bucketObjects, [], 24)
    expect(orphans).toHaveLength(0)
  })

  // ── Test 3 : fichier lié à une étude → pas orphelin ──────────────────────
  it('ne marque pas comme orphelin un fichier référencé par une étude', () => {
    const path = 'user-uuid/user-uuid-linked.edf'
    const bucketObjects = [{ name: path, created_at: ago25h }]
    const studyFilePaths = [path] // étude référence ce fichier

    const orphans = findOrphanPaths(bucketObjects, studyFilePaths, 24)
    expect(orphans).toHaveLength(0)
  })

  // ── Test 4 : mix de fichiers liés, orphelins récents et orphelins anciens ─
  it('filtre correctement parmi plusieurs fichiers', () => {
    const linked = 'user/user-linked.edf'
    const orphanOld = 'user/user-orphan-old.edf'
    const orphanNew = 'user/user-orphan-new.edf'

    const bucketObjects = [
      { name: linked,     created_at: ago25h },
      { name: orphanOld,  created_at: ago25h },
      { name: orphanNew,  created_at: ago10h },
    ]
    const studyFilePaths = [linked]

    const orphans = findOrphanPaths(bucketObjects, studyFilePaths, 24)
    expect(orphans).toEqual([orphanOld])
  })

  // ── Test 5 : bucket vide → aucun orphelin ────────────────────────────────
  it('retourne un tableau vide si le bucket est vide', () => {
    const orphans = findOrphanPaths([], [], 24)
    expect(orphans).toHaveLength(0)
  })

  // ── Test 6 : TTL configurable ────────────────────────────────────────────
  it('respecte le TTL configurable (ex: 48h au lieu de 24h)', () => {
    const ago30h = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString()
    const bucketObjects = [{ name: 'user/file.edf', created_at: ago30h }]

    // Avec TTL 48h : 30h < 48h → pas orphelin
    expect(findOrphanPaths(bucketObjects, [], 48)).toHaveLength(0)
    // Avec TTL 24h : 30h > 24h → orphelin
    expect(findOrphanPaths(bucketObjects, [], 24)).toContain('user/file.edf')
  })
})
