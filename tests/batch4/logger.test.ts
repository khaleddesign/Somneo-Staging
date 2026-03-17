/**
 * BATCH 4 — Logger structuré avec correlation_id
 *
 * Teste lib/logger.ts :
 *   - createLogger() génère un UUID correlation_id si non fourni
 *   - createLogger(id) utilise l'id fourni
 *   - log() émet un objet JSON structuré { level, correlation_id, message, ...meta }
 *   - les niveaux info / warn / error sont supportés
 *   - aucune donnée PHI ne doit apparaître dans les clés réservées
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger } from '@/lib/logger'

// UUID v4 regex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('createLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test 1 : génère un UUID v4 si aucun id fourni
  it('génère un UUID v4 comme correlation_id par défaut', () => {
    const logger = createLogger()
    expect(logger.correlationId).toMatch(UUID_RE)
  })

  // Test 2 : utilise l'id fourni
  it('utilise le correlation_id fourni', () => {
    const id = 'test-id-abc'
    const logger = createLogger(id)
    expect(logger.correlationId).toBe(id)
  })

  // Test 3 : deux loggers ont des ids différents
  it('deux loggers sans id ont des correlation_ids distincts', () => {
    const a = createLogger()
    const b = createLogger()
    expect(a.correlationId).not.toBe(b.correlationId)
  })

  // Test 4 : log info émet un objet structuré
  it('log.info émet { level, correlation_id, message }', () => {
    const logger = createLogger('req-123')
    logger.info('test message')

    expect(consoleSpy).toHaveBeenCalledOnce()
    const [arg] = consoleSpy.mock.calls[0]
    const parsed = JSON.parse(arg)
    expect(parsed.level).toBe('info')
    expect(parsed.correlation_id).toBe('req-123')
    expect(parsed.message).toBe('test message')
    expect(parsed.timestamp).toBeDefined()
  })

  // Test 5 : log warn utilise console.warn
  it('log.warn émet sur console.warn avec level=warn', () => {
    const warnSpy = vi.spyOn(console, 'warn')
    const logger = createLogger('req-456')
    logger.warn('attention')

    expect(warnSpy).toHaveBeenCalledOnce()
    const [arg] = warnSpy.mock.calls[0]
    const parsed = JSON.parse(arg)
    expect(parsed.level).toBe('warn')
    expect(parsed.message).toBe('attention')
  })

  // Test 6 : log error utilise console.error
  it('log.error émet sur console.error avec level=error', () => {
    const errorSpy = vi.spyOn(console, 'error')
    const logger = createLogger('req-789')
    logger.error('erreur critique')

    expect(errorSpy).toHaveBeenCalledOnce()
    const [arg] = errorSpy.mock.calls[0]
    const parsed = JSON.parse(arg)
    expect(parsed.level).toBe('error')
    expect(parsed.message).toBe('erreur critique')
  })

  // Test 7 : meta fields sont inclus dans le log
  it('inclut les meta fields dans le log', () => {
    const logger = createLogger('req-meta')
    logger.info('avec meta', { route: '/api/studies', method: 'GET', status: 200 })

    const [arg] = consoleSpy.mock.calls[0]
    const parsed = JSON.parse(arg)
    expect(parsed.route).toBe('/api/studies')
    expect(parsed.method).toBe('GET')
    expect(parsed.status).toBe(200)
  })

  // Test 8 : timestamp est un ISO string valide
  it('timestamp est un ISO string valide', () => {
    const logger = createLogger('req-ts')
    logger.info('timestamp test')

    const [arg] = consoleSpy.mock.calls[0]
    const parsed = JSON.parse(arg)
    expect(() => new Date(parsed.timestamp)).not.toThrow()
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp)
  })
})
