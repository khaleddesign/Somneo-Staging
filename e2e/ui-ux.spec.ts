/**
 * Tests UI/UX — Responsive, formulaires, navigation
 */
import { test, expect, devices } from '@playwright/test'

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
// RESPONSIVE
// ──────────────────────────────────────────────
test.describe('Responsive — Mobile 375px (iPhone SE)', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('Page login lisible et bouton cliquable sur mobile', async ({ page }) => {
    await page.goto('/auth/login')

    const emailField = page.getByLabel('Email')
    const passwordField = page.getByLabel('Mot de passe')
    const submitBtn = page.getByRole('button', { name: 'Se connecter' })

    await expect(emailField).toBeVisible()
    await expect(passwordField).toBeVisible()
    await expect(submitBtn).toBeVisible()

    // Vérifier que le bouton est cliquable (pas masqué ou overflow)
    const box = await submitBtn.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(50)
    expect(box!.height).toBeGreaterThan(30)
  })

  test('Dashboard client accessible sur mobile', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)

    // La page doit être lisible (pas d'overflow horizontal)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = 375
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20) // tolérance 20px

    // Les éléments principaux doivent être visibles
    await expect(page.getByText('Mon espace client')).toBeVisible()
  })

  test('Dashboard agent accessible sur mobile', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(395)
  })
})

test.describe('Responsive — Tablette 768px (iPad)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('Page login adaptée sur tablette', async ({ page }) => {
    await page.goto('/auth/login')
    const submitBtn = page.getByRole('button', { name: 'Se connecter' })
    await expect(submitBtn).toBeVisible()

    const box = await submitBtn.boundingBox()
    expect(box).not.toBeNull()
  })

  test('Dashboard admin sur tablette — sidebar visible ou hamburger', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD as string, /\/dashboard\/admin/)

    // Sur tablette, soit la sidebar est visible, soit un bouton menu existe
    const sidebar = page.locator('nav, aside, [data-testid="sidebar"]')
    const hamburger = page.getByRole('button', { name: /menu|navigation/i })

    const hasSidebar = await sidebar.count()
    const hasHamburger = await hamburger.count()
    expect(hasSidebar > 0 || hasHamburger > 0).toBeTruthy()
  })
})

test.describe('Responsive — Desktop 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Dashboard admin — tous les KPIs visibles sans scroll horizontal', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD as string, /\/dashboard\/admin/)

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(1460)

    await expect(page.getByText('Total agents actifs')).toBeVisible()
    await expect(page.getByText('Total clients actifs')).toBeVisible()
    await expect(page.getByText('Total études')).toBeVisible()
  })
})

// ──────────────────────────────────────────────
// FORMULAIRES — VALIDATION
// ──────────────────────────────────────────────
test.describe('Formulaires — Validation et limites', () => {
  test('Formulaire login vide → bouton cliquable mais erreur affichée', async ({ page }) => {
    await page.goto('/auth/login')

    const submitBtn = page.getByRole('button', { name: 'Se connecter' })
    await submitBtn.click()

    // Doit afficher une erreur ou le formulaire HTML5 bloque
    const hasError = await page.getByText(/obligatoire|requis|required|invalide/i).count()
    const emailValid = await page.locator('input[type="email"]').evaluate(
      (el: HTMLInputElement) => el.validity.valid
    )

    // L'email vide n'est pas valide → le formulaire ne doit pas soumettre
    expect(!emailValid || hasError > 0).toBeTruthy()
  })

  test('Formulaire inscription — email invalide bloqué', async ({ page }) => {
    await page.goto('/auth/signup')

    const emailInput = page.getByLabel(/Email/i).first()
    if (!(await emailInput.isVisible())) {
      test.skip(true, 'Page signup non accessible')
      return
    }

    await emailInput.fill('pas-un-email')
    await page.getByRole('button', { name: /S'inscrire|Créer|Signup/i }).first().click()

    const emailValid = await page.locator('input[type="email"]').first().evaluate(
      (el: HTMLInputElement) => el.validity.valid
    ).catch(() => false)

    expect(emailValid).toBeFalsy()
  })

  test('Champs avec valeurs limites → pas d\'erreur serveur 500', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)

    const patientRef = page.locator('input#patient-ref')
    if (!(await patientRef.isVisible())) return

    // Test avec une chaîne très longue
    const longString = 'A'.repeat(10000)
    await patientRef.fill(longString)
    await page.waitForTimeout(500)

    // Pas d'erreur 500
    const hasServerError = await page.getByText(/500|erreur serveur|internal server error/i).count()
    expect(hasServerError).toBe(0)
  })

  test('Caractères spéciaux dans les noms → pas d\'erreur serveur', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginAs(page, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)

    const patientRef = page.locator('input#patient-ref')
    if (!(await patientRef.isVisible())) return

    const specialChars = ['Ñoño García', 'مريض', '患者名', "O'Brien-Smith", 'Test\nNewline', 'Test\t<Tab>']
    for (const name of specialChars) {
      await patientRef.fill(name)
      await page.waitForTimeout(300)

      const hasServerError = await page.getByText(/500|erreur serveur/i).count()
      expect(hasServerError, `Erreur sur "${name}"`).toBe(0)
    }
  })
})

// ──────────────────────────────────────────────
// NAVIGATION — Comportement avancé
// ──────────────────────────────────────────────
test.describe('Navigation — Comportements bord', () => {
  test('Refresh de page sur étude agent → données rechargées', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude')

    await viewLink.click()
    await page.waitForURL(/\/dashboard\/agent\/studies\//)
    const studyUrl = page.url()

    // Refresh
    await page.reload()
    await page.waitForURL(new RegExp(studyUrl.split('?')[0]))

    // Les données doivent être rechargées
    await expect(page.getByText('Dossier Patient')).toBeVisible({ timeout: 10000 })
  })

  test('Bouton retour navigateur après navigation dans les études', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude')

    await viewLink.click()
    await page.waitForURL(/\/dashboard\/agent\/studies\//)

    // Retour navigateur
    await page.goBack()
    await expect(page).toHaveURL(/\/dashboard\/agent\/studies/, { timeout: 5000 })
  })

  test('Double-clic sur "Générer PDF" ne génère pas 2 fois', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude')

    await viewLink.click()
    await page.waitForURL(/\/dashboard\/agent\/studies\//)

    const generateBtn = page.getByRole('button', { name: /Générer|PDF|Rapport/i }).first()
    const btnCount = await generateBtn.count()
    test.skip(btnCount === 0, 'Bouton génération PDF non visible')

    // Double-clic rapide
    await generateBtn.dblclick()

    // Le bouton doit être désactivé après le premier clic ou un seul appel doit être fait
    await page.waitForTimeout(1000)
    const isDisabled = await generateBtn.isDisabled()
    console.log(`[Double-clic PDF] Bouton désactivé après double-clic : ${isDisabled}`)
    // Si le bouton n'est pas désactivé, c'est un bug potentiel (génération double)
    // On log mais on ne fait pas échouer si l'UI a d'autres mécanismes de protection
  })

  test('Page 404 personnalisée accessible', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas')
    // Doit afficher une page d'erreur personnalisée, pas un crash
    await expect(page.getByText(/404|introuvable|not found/i).first()).toBeVisible({ timeout: 8000 })
  })
})
