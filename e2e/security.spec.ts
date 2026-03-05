import { test, expect } from '@playwright/test'

const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL
const AGENT_PASSWORD = process.env.E2E_AGENT_PASSWORD
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD

async function loginAgent(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(AGENT_EMAIL as string)
  await page.getByLabel('Mot de passe').fill(AGENT_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/agent/, { timeout: 10000 })
}

async function loginClient(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(CLIENT_EMAIL as string)
  await page.getByLabel('Mot de passe').fill(CLIENT_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/client/, { timeout: 10000 })
}

test.describe('Sécurité & Contrôle d\'accès E2E', () => {
  test('Utilisateur non connecté redirigé vers /auth/login', async ({ page }) => {
    await page.goto('/dashboard/client')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 })
  })

  test('Utilisateur non connecté sur /dashboard/agent redirigé vers /auth/login', async ({ page }) => {
    await page.goto('/dashboard/agent')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 })
  })

  test('Utilisateur non connecté sur /dashboard/admin redirigé vers /auth/login', async ({ page }) => {
    await page.goto('/dashboard/admin')
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8000 })
  })

  test('Client ne peut pas accéder à /dashboard/agent', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginClient(page)
    await page.goto('/dashboard/agent')

    // Doit être redirigé (pas sur /dashboard/agent) ou afficher une erreur
    await page.waitForTimeout(3000)
    const url = page.url()
    const isOnAgentDashboard = url.includes('/dashboard/agent') && !url.includes('/auth/')

    // Si redirigé vers login ou client dashboard → OK
    // Si bloqué avec message d'accès refusé → aussi OK
    if (isOnAgentDashboard) {
      // Vérifier qu'il n'y a pas le contenu agent (pool d'études, etc.)
      const poolHeading = await page.getByRole('heading', { name: /Pool d.études disponibles/i }).count()
      expect(poolHeading).toBe(0)
    } else {
      // Redirigé → test passe
      expect(url).not.toContain('/dashboard/agent')
    }
  })

  test('Agent ne peut pas accéder à /dashboard/admin', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAgent(page)
    await page.goto('/dashboard/admin')

    await page.waitForTimeout(3000)
    const url = page.url()

    // Doit être redirigé ou voir une page d'erreur
    if (url.includes('/dashboard/admin')) {
      // Si sur la page admin, vérifier qu'il n'y a pas le contenu admin
      const tourHeading = await page.getByRole('heading', { name: /Tour de contrôle/i }).count()
      expect(tourHeading).toBe(0)
    } else {
      expect(url).not.toContain('/dashboard/admin')
    }
  })

  test('Client ne peut pas voir une étude avec UUID inexistant → 404', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginClient(page)
    await page.goto('/dashboard/client/studies/00000000-0000-0000-0000-000000000000')

    await expect(page.getByText(/404|introuvable|not found/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('API /api/stats sans authentification retourne 401', async ({ request }) => {
    const response = await request.get('/api/stats')
    expect(response.status()).toBe(401)
  })

  test('API /api/agents sans authentification retourne 401', async ({ request }) => {
    const response = await request.get('/api/agents')
    expect(response.status()).toBe(401)
  })

  test('API /api/clients sans authentification retourne 401', async ({ request }) => {
    const response = await request.get('/api/clients')
    expect(response.status()).toBe(401)
  })
})
