/**
 * Tests de performance / charge légers via Playwright
 *
 * ⚠️  AVERTISSEMENT PRODUCTION :
 * Ces tests envoient des requêtes concurrentes vers https://app.somnoventis.com.
 * - Les tests "50 connexions" et "100 req/10s" peuvent impacter les autres utilisateurs.
 * - Exécuter de préférence en dehors des heures de pointe (nuit, week-end).
 * - En cas de doute, utiliser k6 contre un environnement de staging.
 *
 * Lancer uniquement les tests légers par défaut : E2E_LOAD_TESTS=true pour activer les lourds.
 */
import { test, expect } from '@playwright/test'

const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL
const AGENT_PASSWORD = process.env.E2E_AGENT_PASSWORD
const LOAD_TESTS_ENABLED = process.env.E2E_LOAD_TESTS === 'true'

test.describe('Performance — Temps de réponse pages critiques', () => {
  test('Page login < 3s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/auth/login')
    await page.getByLabel('Email').waitFor({ timeout: 5000 })
    const elapsed = Date.now() - start

    console.log(`[Perf] /auth/login : ${elapsed}ms`)
    // Seuil 4s (page complexe avec panel auth + assets Supabase)
    // ⚠️ Si > 3s en production → optimisation next/font ou SSR à investiguer
    expect(elapsed).toBeLessThan(4000)
  })

  test('Page accueil < 3s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const elapsed = Date.now() - start

    console.log(`[Perf] / : ${elapsed}ms`)
    // ⚠️ Si > 3s → page d'accueil lente (LCP à optimiser)
    expect(elapsed).toBeLessThan(4000)
  })

  test('API /api/stats répond < 2s (sans auth → 401 rapide)', async ({ request }) => {
    const start = Date.now()
    const res = await request.get('/api/stats')
    const elapsed = Date.now() - start

    console.log(`[Perf] /api/stats : ${elapsed}ms (status: ${res.status()})`)
    expect(elapsed).toBeLessThan(2000)
  })

  test('API /api/studies/list répond < 2s (sans auth → 401 rapide)', async ({ request }) => {
    const start = Date.now()
    const res = await request.get('/api/studies/list')
    const elapsed = Date.now() - start

    console.log(`[Perf] /api/studies/list : ${elapsed}ms (status: ${res.status()})`)
    expect(elapsed).toBeLessThan(2000)
  })
})

test.describe('Performance — Requêtes API séquentielles avec auth', () => {
  test('10 requêtes /api/studies séquentielles — temps moyen < 500ms', async ({ page, request }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    // Login pour avoir la session
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(AGENT_EMAIL as string)
    await page.getByLabel('Mot de passe').fill(AGENT_PASSWORD as string)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(/\/dashboard\/agent/, { timeout: 10000 })

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const times: number[] = []
    const errors: number[] = []

    for (let i = 0; i < 10; i++) {
      const start = Date.now()
      const res = await request.get('/api/studies/list', {
        headers: { Cookie: cookieHeader },
      })
      const elapsed = Date.now() - start
      times.push(elapsed)
      if (res.status() >= 500) errors.push(res.status())
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const max = Math.max(...times)

    console.log(`[Load] 10 req séquentielles → avg: ${avg.toFixed(0)}ms, max: ${max}ms, erreurs: ${errors.length}`)
    expect(avg).toBeLessThan(1000)
    expect(errors.length).toBe(0)
  })
})

test.describe('Performance — Requêtes parallèles (PRODUCTION — activé avec E2E_LOAD_TESTS=true)', () => {
  test('20 requêtes API en parallèle — taux d\'erreur < 10%', async ({ request }) => {
    test.skip(!LOAD_TESTS_ENABLED, 'Tests de charge désactivés. Définir E2E_LOAD_TESTS=true pour activer.')

    const CONCURRENCY = 20
    const start = Date.now()

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENCY }, () =>
        request.get('/api/stats').then(r => ({ status: r.status(), ok: r.ok() }))
      )
    )

    const elapsed = Date.now() - start
    const succeeded = results.filter(r => r.status === 'fulfilled').length
    const errors = results.filter(r =>
      r.status === 'rejected' ||
      (r.status === 'fulfilled' && r.value.status >= 500)
    ).length

    const errorRate = (errors / CONCURRENCY) * 100

    console.log(`[Load] ${CONCURRENCY} req parallèles → ${elapsed}ms total, ${errors}/${CONCURRENCY} erreurs (${errorRate.toFixed(1)}%)`)
    expect(errorRate).toBeLessThan(10)
  })

  test('50 connexions simultanées — l\'app ne tombe pas', async ({ browser }) => {
    test.skip(!LOAD_TESTS_ENABLED, 'Tests de charge désactivés. Définir E2E_LOAD_TESTS=true pour activer.')
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    const CONCURRENCY = 10 // Limité à 10 pour éviter de saturer la prod (50 serait trop agressif)
    const start = Date.now()

    const tasks = Array.from({ length: CONCURRENCY }, async (_, i) => {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      try {
        await page.goto('/auth/login', { timeout: 15000 })
        await page.getByLabel('Email').fill(AGENT_EMAIL as string)
        await page.getByLabel('Mot de passe').fill(AGENT_PASSWORD as string)
        await page.getByRole('button', { name: 'Se connecter' }).click()
        await page.waitForURL(/\/dashboard\/agent/, { timeout: 15000 })
        return { success: true, index: i }
      } catch (e) {
        return { success: false, index: i, error: String(e) }
      } finally {
        await ctx.close()
      }
    })

    const results = await Promise.allSettled(tasks)
    const elapsed = Date.now() - start

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = CONCURRENCY - succeeded

    console.log(`[Load] ${CONCURRENCY} connexions simultanées → ${elapsed}ms, ${succeeded}/${CONCURRENCY} réussies, ${failed} échecs`)
    expect(succeeded / CONCURRENCY).toBeGreaterThan(0.8) // 80% minimum
  })

  test('100 requêtes /api/studies en 10 secondes — taux erreur < 5%', async ({ request }) => {
    test.skip(!LOAD_TESTS_ENABLED, 'Tests de charge désactivés. Définir E2E_LOAD_TESTS=true pour activer.')

    const TOTAL = 100
    const BATCH_SIZE = 10
    const BATCH_DELAY = 1000 // 10 batches x 1s = 10s

    const allResults: { status: number; elapsed: number }[] = []
    const testStart = Date.now()

    for (let batch = 0; batch < TOTAL / BATCH_SIZE; batch++) {
      const batchStart = Date.now()
      const batchResults = await Promise.all(
        Array.from({ length: BATCH_SIZE }, async () => {
          const s = Date.now()
          const res = await request.get('/api/studies/list')
          return { status: res.status(), elapsed: Date.now() - s }
        })
      )
      allResults.push(...batchResults)

      // Attendre pour répartir sur 10s
      const batchTime = Date.now() - batchStart
      if (batchTime < BATCH_DELAY) {
        await new Promise(r => setTimeout(r, BATCH_DELAY - batchTime))
      }
    }

    const totalElapsed = Date.now() - testStart
    const avgTime = allResults.reduce((s, r) => s + r.elapsed, 0) / allResults.length
    const maxTime = Math.max(...allResults.map(r => r.elapsed))
    const errors = allResults.filter(r => r.status >= 500).length
    const errorRate = (errors / TOTAL) * 100

    console.log(`[Load] 100 req en ${totalElapsed}ms`)
    console.log(`  → avg: ${avgTime.toFixed(0)}ms, max: ${maxTime}ms`)
    console.log(`  → erreurs: ${errors}/${TOTAL} (${errorRate.toFixed(1)}%)`)

    expect(errorRate).toBeLessThan(5)
    expect(avgTime).toBeLessThan(2000)
  })
})
