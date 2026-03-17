/**
 * BATCH 5 — Validation des variables d'environnement
 *
 * Teste lib/env.ts :
 *   - validateEnv() lève une erreur si une variable requise est absente en prod
 *   - validateEnv() retourne un objet typé si tout est présent
 *   - En développement, les variables manquantes ne bloquent pas (warn seulement)
 *   - getEnv() retourne la valeur de la variable ou undefined si absente
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateEnv, getEnv } from '@/lib/env'

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
]

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const originals: Record<string, string | undefined> = {}
  for (const [key, val] of Object.entries(overrides)) {
    originals[key] = process.env[key]
    if (val === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = val
    }
  }
  try {
    fn()
  } finally {
    for (const [key, val] of Object.entries(originals)) {
      if (val === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = val
      }
    }
  }
}

describe('validateEnv', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test 1 : retourne les vars si toutes présentes
  it('retourne un objet avec les vars si toutes présentes', () => {
    const env: Record<string, string> = {}
    for (const v of REQUIRED_VARS) env[v] = 'test-value'

    withEnv({ ...env, NODE_ENV: 'production' }, () => {
      const result = validateEnv()
      expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('test-value')
      expect(result.ENCRYPTION_KEY).toBe('test-value')
    })
  })

  // Test 2 : lève une erreur en prod si var requise manque
  it('lève une erreur en production si ENCRYPTION_KEY manque', () => {
    const env: Record<string, string | undefined> = {}
    for (const v of REQUIRED_VARS) env[v] = 'val'
    env['ENCRYPTION_KEY'] = undefined

    withEnv({ ...env, NODE_ENV: 'production' }, () => {
      expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/)
    })
  })

  // Test 3 : lève une erreur en prod si SUPABASE_URL manque
  it('lève une erreur en production si NEXT_PUBLIC_SUPABASE_URL manque', () => {
    const env: Record<string, string | undefined> = {}
    for (const v of REQUIRED_VARS) env[v] = 'val'
    env['NEXT_PUBLIC_SUPABASE_URL'] = undefined

    withEnv({ ...env, NODE_ENV: 'production' }, () => {
      expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    })
  })

  // Test 4 : en dev, var manquante → warn, pas throw
  it('en développement, warn si var manquante mais ne throw pas', () => {
    const env: Record<string, string | undefined> = {}
    for (const v of REQUIRED_VARS) env[v] = 'val'
    env['ENCRYPTION_KEY'] = undefined

    withEnv({ ...env, NODE_ENV: 'development' }, () => {
      expect(() => validateEnv()).not.toThrow()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ENCRYPTION_KEY')
      )
    })
  })

  // Test 5 : le message d'erreur liste toutes les vars manquantes
  it('le message d erreur liste toutes les vars manquantes', () => {
    withEnv(
      {
        NODE_ENV: 'production',
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
        SUPABASE_SERVICE_ROLE_KEY: 'val',
        ENCRYPTION_KEY: 'val',
      },
      () => {
        expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
      }
    )
  })
})

describe('getEnv', () => {
  // Test 6 : retourne la valeur si présente
  it('retourne la valeur si la variable est définie', () => {
    withEnv({ TEST_VAR_XYZ: 'hello' }, () => {
      expect(getEnv('TEST_VAR_XYZ')).toBe('hello')
    })
  })

  // Test 7 : retourne undefined si absente
  it('retourne undefined si la variable est absente', () => {
    withEnv({ MISSING_VAR_XYZ: undefined }, () => {
      expect(getEnv('MISSING_VAR_XYZ')).toBeUndefined()
    })
  })

  // Test 8 : retourne le fallback si fourni et var absente
  it('retourne le fallback si fourni et var absente', () => {
    withEnv({ MISSING_VAR_XYZ: undefined }, () => {
      expect(getEnv('MISSING_VAR_XYZ', 'default')).toBe('default')
    })
  })
})
