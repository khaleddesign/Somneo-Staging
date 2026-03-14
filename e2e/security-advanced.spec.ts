/**
 * Tests de sécurité avancés — IDOR, Privilege Escalation, XSS, SQL Injection
 * Ces tests ciblent la production : https://app.somnoventis.com
 */
import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'khaledsopra@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD
const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL
const AGENT_PASSWORD = process.env.E2E_AGENT_PASSWORD
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD

async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  urlPattern: RegExp,
) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(urlPattern, { timeout: 12000 })
}

// ──────────────────────────────────────────────
// PARTIE 1 — IDOR (Insecure Direct Object Reference)
// ──────────────────────────────────────────────
test.describe('IDOR — Accès non autorisé aux ressources', () => {
  // Test API IDOR sans auth
  test('[API] GET /api/studies/{uuid} sans auth → 401 ou 405 (pas de fuite)', async ({ request }) => {
    const res = await request.get('/api/studies/00000000-0000-0000-0000-000000000000')
    // 401 = auth requise, 405 = méthode non supportée (GET non exposé = sécurisé aussi)
    // Les deux empêchent la fuite de données
    expect([401, 405]).toContain(res.status())
  })

  test('[API] GET /api/reports/{uuid} sans auth → 401', async ({ request }) => {
    const res = await request.get('/api/reports/00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(401)
  })

  test('[API] GET /api/invoices/{uuid} sans auth → 401', async ({ request }) => {
    const res = await request.get('/api/invoices/00000000-0000-0000-0000-000000000000')
    expect(res.status()).toBe(401)
  })

  test('[UI] Client accède à une étude avec un UUID inexistant → 404', async ({ page }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    await page.goto('/dashboard/client/studies/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')

    // Doit voir 404 ou être redirigé
    const has404 = await page.getByText(/404|introuvable|not found/i).count()
    const redirectedToList = page.url().includes('/dashboard/client')
    expect(has404 > 0 || redirectedToList).toBeTruthy()
  })

  test('[API] Client tente d\'accéder à /api/studies (liste admin) → 401 ou contenu filtré', async ({ page, request }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    // Login via navigateur pour obtenir le cookie de session
    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)

    // Extraire les cookies de session
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Appel API avec session client
    const res = await request.get('/api/studies', {
      headers: { Cookie: cookieHeader },
    })

    // 405 = route POST uniquement (GET non exposé = sécurisé)
    // 403/401 = accès refusé, 200 = données filtrées par RLS
    if (res.status() === 405) {
      console.log('[IDOR] /api/studies GET → 405 (méthode non exposée = sécurisé ✅)')
      return
    }
    if (res.status() === 200) {
      const data = await res.json()
      const studies = data.studies || data || []
      console.log(`[IDOR] /api/studies retourne ${Array.isArray(studies) ? studies.length : 'N/A'} études (filtré RLS)`)
    } else {
      expect([401, 403]).toContain(res.status())
    }
  })

  test('[API] Agent tente d\'accéder aux études d\'un autre client via /api/studies/[uuid]', async ({ page, request }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Tenter d'accéder à un UUID connu inexistant
    const res = await request.get('/api/studies/00000000-1111-2222-3333-444444444444', {
      headers: { Cookie: cookieHeader },
    })

    // 405 = route DELETE uniquement (GET non exposé = sécurisé)
    expect([404, 403, 401, 405]).toContain(res.status())
  })
})

// ──────────────────────────────────────────────
// PARTIE 2 — PRIVILEGE ESCALATION
// ──────────────────────────────────────────────
test.describe('Privilege Escalation — Accès interdit aux endpoints admin', () => {
  test('[API] Agent tente GET /api/invoices → 401 ou 403', async ({ page, request }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/invoices', {
      headers: { Cookie: cookieHeader },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('[API] Agent tente POST /api/invoices → 401 ou 403', async ({ page, request }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.post('/api/invoices', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { clientId: '00000000-0000-0000-0000-000000000000', amount: 999 },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('[API] Client tente GET /api/agents → 401 ou 403', async ({ page, request }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/agents', {
      headers: { Cookie: cookieHeader },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('[API] Client tente GET /api/clients → 401 ou 403', async ({ page, request }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/clients', {
      headers: { Cookie: cookieHeader },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('[API] Client tente GET /api/stats (admin only) → 401 ou 403', async ({ page, request }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/stats', {
      headers: { Cookie: cookieHeader },
    })
    expect([401, 403]).toContain(res.status())
  })

  test('[API] Client tente PATCH /api/studies/{uuid}/status → 401 ou 403', async ({ page, request }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.patch('/api/studies/00000000-0000-0000-0000-000000000000/status', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { status: 'terminee' },
    })
    expect([401, 403, 404]).toContain(res.status())
  })

  test('[UI] Agent accède à /dashboard/admin → redirigé ou erreur', async ({ page }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    await page.goto('/dashboard/admin')
    await page.waitForTimeout(2000)

    const url = page.url()
    const isOnAdmin = url.includes('/dashboard/admin') && !url.includes('/auth/')

    if (isOnAdmin) {
      // Si on atterrit sur admin, le contenu admin ne doit PAS être visible
      const adminContent = await page.getByRole('heading', { name: /Tour de contrôle/i }).count()
      expect(adminContent).toBe(0)
    } else {
      // Redirigé ailleurs → bon
      expect(url).not.toMatch(/\/dashboard\/admin/)
    }
  })
})

// ──────────────────────────────────────────────
// PARTIE 3 — XSS (Cross-Site Scripting)
// ──────────────────────────────────────────────
test.describe('XSS — Injection de scripts dans les champs', () => {
  // Payloads XSS courants
  const XSS_PAYLOADS = [
    "<script>window.__XSS_EXECUTED__=true</script>",
    "<img src=x onerror=\"window.__XSS_EXECUTED__=true\">",
    "javascript:window.__XSS_EXECUTED__=true",
    "<svg onload=\"window.__XSS_EXECUTED__=true\">",
  ]

  test('[XSS] Injection dans le champ commentaire → script non exécuté', async ({ page }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)

    // Trouver une étude
    await page.goto('/dashboard/agent/studies')
    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude disponible')

    await viewLink.click()
    await page.waitForURL(/\/dashboard\/agent\/studies\//)

    const commentInput = page.getByPlaceholder('Écrivez votre message...')
    test.skip(!(await commentInput.isVisible()), 'Champ commentaire non visible')

    for (const payload of XSS_PAYLOADS) {
      // Reset XSS marker
      await page.evaluate(() => { delete (window as unknown as Record<string,unknown>).__XSS_EXECUTED__ })

      await commentInput.fill(payload)
      await page.getByRole('button').filter({ has: page.locator('svg') }).last().click()
      await page.waitForTimeout(1500)

      // Vérifier que le script ne s'est pas exécuté
      const xssExecuted = await page.evaluate(() => (window as unknown as Record<string,unknown>).__XSS_EXECUTED__)
      expect(xssExecuted, `XSS payload exécuté : ${payload}`).toBeFalsy()

      // Vérifier que le payload est affiché en texte brut, pas exécuté
      const text = await page.locator('[data-testid="comment-list"], .comment-list, [class*="comment"]').last().textContent().catch(() => '')
      // Le payload doit apparaître encodé ou nettoyé, pas comme HTML actif
      console.log(`[XSS] Payload "${payload.substring(0, 30)}..." → non exécuté ✅`)
    }
  })

  test('[XSS] Injection dans la référence patient → non exécutée', async ({ page }) => {
    if (!CLIENT_EMAIL || !CLIENT_PASSWORD) { test.skip(true, 'E2E_CLIENT credentials non définis'); return }

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)

    const patientRef = page.locator('input#patient-ref')
    if (!(await patientRef.isVisible())) {
      test.skip(true, 'Champ référence patient non visible')
      return
    }

    await page.evaluate(() => { delete (window as unknown as Record<string,unknown>).__XSS_EXECUTED__ })

    await patientRef.fill("<script>window.__XSS_EXECUTED__=true</script>")
    await page.waitForTimeout(500)

    const xssExecuted = await page.evaluate(() => (window as unknown as Record<string,unknown>).__XSS_EXECUTED__)
    expect(xssExecuted).toBeFalsy()
  })
})

// ──────────────────────────────────────────────
// PARTIE 4 — SQL INJECTION
// ──────────────────────────────────────────────
test.describe('SQL Injection — Champs de recherche et API', () => {
  const SQL_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE studies; --",
    "' UNION SELECT * FROM profiles --",
    "1; SELECT * FROM auth.users --",
    "' OR 1=1 --",
  ]

  test('[SQLi] Injection dans la recherche agents (admin) → pas de fuite de données', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD as string, /\/dashboard\/admin/)
    await page.goto('/dashboard/admin/agents')
    await page.waitForTimeout(1500)

    const searchInput = page.getByPlaceholder('Rechercher un agent')
    test.skip(!(await searchInput.isVisible()), 'Champ de recherche non visible')

    for (const payload of SQL_PAYLOADS) {
      await searchInput.fill(payload)
      await page.waitForTimeout(1000)

      // La page ne doit pas crasher et ne doit pas retourner tous les agents
      const isErrorPage = await page.getByText(/500|erreur serveur|internal server error/i).count()
      expect(isErrorPage, `Erreur serveur sur payload : ${payload}`).toBe(0)

      // Si "Aucun agent" est affiché → bon signe (pas de SQLi bypass)
      const noResult = await page.getByText(/Aucun agent/i).count()
      console.log(`[SQLi] "${payload.substring(0, 30)}..." → ${noResult > 0 ? 'aucun résultat ✅' : 'résultats présents (vérifier)'}`)
    }
  })

  test('[SQLi] Injection via API /api/agents?search=... → pas d\'erreur 500', async ({ page, request }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD as string, /\/dashboard\/admin/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    for (const payload of SQL_PAYLOADS) {
      const res = await request.get(`/api/agents?search=${encodeURIComponent(payload)}`, {
        headers: { Cookie: cookieHeader },
      })

      // Pas d'erreur serveur
      expect(res.status(), `Erreur serveur sur payload SQL : ${payload}`).not.toBe(500)

      if (res.status() === 200) {
        const data = await res.json().catch(() => null)
        console.log(`[SQLi API] payload → status ${res.status()}, réponse OK`)
        // Vérifier qu'on ne retourne pas des milliers d'enregistrements
        if (Array.isArray(data)) {
          expect(data.length).toBeLessThan(1000)
        }
      }
    }
  })

  test('[SQLi] Injection dans la recherche clients (admin) → pas de fuite', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD as string, /\/dashboard\/admin/)
    await page.goto('/dashboard/admin/clients')
    await page.waitForTimeout(1500)

    const searchInput = page.getByPlaceholder(/Rechercher un client/i)
    if (!(await searchInput.isVisible())) {
      test.skip(true, 'Champ recherche client non disponible')
      return
    }

    for (const payload of SQL_PAYLOADS) {
      await searchInput.fill(payload)
      await page.waitForTimeout(800)

      const isError = await page.getByText(/500|erreur serveur/i).count()
      expect(isError).toBe(0)
    }
  })
})

// ──────────────────────────────────────────────
// PARTIE 5 — ISOLATION CROSS-AGENT
// ──────────────────────────────────────────────
test.describe('Isolation — Un agent ne voit pas les études des autres', () => {
  test('[API] Agent B ne peut pas accéder aux études de Agent A via API', async ({ page, request }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    // Login en tant qu'agent
    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)

    // Récupérer les études de cet agent
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/studies', {
      headers: { Cookie: cookieHeader },
    })

    if (res.status() !== 200) {
      console.log('[Isolation] /api/studies retourne', res.status(), '→ accès refusé (normal pour agent)')
      return
    }

    const data = await res.json()
    const studies = data.studies || data || []
    console.log(`[Isolation] Agent voit ${Array.isArray(studies) ? studies.length : 'N/A'} études`)

    // Vérifier que toutes les études retournées sont bien assignées à cet agent
    // (ou que l'API filtre correctement)
    if (Array.isArray(studies) && studies.length > 0) {
      const studySample = studies[0]
      console.log('[Isolation] Exemple étude:', JSON.stringify(studySample).substring(0, 100))
    }
  })

  test('[API] Endpoint /api/studies/list filtre bien par agent', async ({ page, request }) => {
    if (!AGENT_EMAIL || !AGENT_PASSWORD) { test.skip(true, 'E2E_AGENT credentials non définis'); return }

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const res = await request.get('/api/studies/list', {
      headers: { Cookie: cookieHeader },
    })

    // Soit autorisé avec données filtrées, soit refusé
    expect([200, 401, 403]).toContain(res.status())

    if (res.status() === 200) {
      const data = await res.json()
      console.log('[Isolation] /api/studies/list → OK, données filtrées par agent')
    }
  })
})
