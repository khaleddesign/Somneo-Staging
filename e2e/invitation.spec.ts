import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'khaledsopra@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/admin/, { timeout: 10000 })
}

test.describe('Invitation E2E', () => {
  test('Admin envoie une invitation client → dialog se ferme', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/clients')

    await page.getByRole('button', { name: /Inviter un client/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Remplir les champs (pas de htmlFor → cibler par position dans le dialog)
    const inputs = dialog.locator('input')
    await inputs.nth(0).fill('Client E2E Test')
    await inputs.nth(1).fill(`e2e-client-${Date.now()}@test-somnoconnect.com`)

    await dialog.getByRole('button', { name: /Envoyer l'invitation/ }).click()

    // Succès : dialog se ferme
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
  })

  test('Admin envoie une invitation agent → dialog se ferme', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/agents')

    await page.getByRole('button', { name: /Ajouter un agent/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const inputs = dialog.locator('input')
    await inputs.nth(0).fill('Agent E2E Test')
    await inputs.nth(1).fill(`e2e-agent-${Date.now()}@test-somnoconnect.com`)

    // Rôle : laisser par défaut "Agent"
    await dialog.getByRole('button', { name: /Envoyer l'invitation/ }).click()

    // Succès : dialog se ferme
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
  })

  test('Invitation avec email vide → bouton désactivé', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/clients')

    await page.getByRole('button', { name: /Inviter un client/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Email vide → bouton submit désactivé
    const submitBtn = dialog.getByRole('button', { name: /Envoyer l'invitation/ })
    await expect(submitBtn).toBeDisabled()
  })

  test('Invitation avec email invalide → bouton reste cliquable (pas de validation HTML5)', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/agents')

    await page.getByRole('button', { name: /Ajouter un agent/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const inputs = dialog.locator('input')
    await inputs.nth(0).fill('Test')
    await inputs.nth(1).fill('pas-un-email-valide')

    // Le champ email est type="text" sur cette page, pas type="email"
    // Le bouton d'envoi doit donc rester actif (pas de validation HTML5 native)
    const submitBtn = dialog.getByRole('button', { name: /Envoyer l'invitation/ })
    await expect(submitBtn).not.toBeDisabled()
  })
})
