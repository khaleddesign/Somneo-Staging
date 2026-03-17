import { test, expect } from '@playwright/test'

// Test accounts (from memory): client@test.com and client2@test.com are in the same institution
const CLIENT1_EMAIL = process.env.E2E_CLIENT_EMAIL ?? 'client@test.com'
const CLIENT1_PASSWORD = process.env.E2E_CLIENT_PASSWORD
const CLIENT2_EMAIL = process.env.E2E_CLIENT2_EMAIL ?? 'client2@test.com'
const CLIENT2_PASSWORD = process.env.E2E_CLIENT2_PASSWORD

async function loginClient(
  page: import('@playwright/test').Page,
  email: string,
  password: string
) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/client/, { timeout: 10000 })
}

test.describe('Institution visibility — Client UI', () => {
  test('onglet "Mes études" visible par défaut', async ({ page }) => {
    test.skip(!CLIENT1_PASSWORD, 'E2E_CLIENT_PASSWORD non défini')

    await loginClient(page, CLIENT1_EMAIL, CLIENT1_PASSWORD as string)
    await page.goto('/dashboard/client/studies')

    // The "Mes études" tab should be present and active
    await expect(page.getByRole('tab', { name: /Mes études/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Mon institution/i })).toBeVisible()

    // "Soumis par" column should NOT be visible in "Mes études" tab
    expect(await page.getByText('Soumis par').count()).toBe(0)
  })

  test('onglet "Mon institution" affiche la colonne "Soumis par"', async ({ page }) => {
    test.skip(!CLIENT1_PASSWORD, 'E2E_CLIENT_PASSWORD non défini')

    await loginClient(page, CLIENT1_EMAIL, CLIENT1_PASSWORD as string)
    await page.goto('/dashboard/client/studies')

    await page.getByRole('tab', { name: /Mon institution/i }).click()

    // "Soumis par" column should appear
    await expect(page.getByText('Soumis par')).toBeVisible({ timeout: 5000 })
  })

  test('client dashboard affiche le KPI "Mon institution"', async ({ page }) => {
    test.skip(!CLIENT1_PASSWORD, 'E2E_CLIENT_PASSWORD non défini')

    await loginClient(page, CLIENT1_EMAIL, CLIENT1_PASSWORD as string)
    await page.goto('/dashboard/client')

    // The 5th KPI card
    await expect(page.getByText('Mon institution')).toBeVisible({ timeout: 5000 })
  })
})
