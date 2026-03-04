import { test, expect } from '@playwright/test'

const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD

async function loginClient(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(CLIENT_EMAIL as string)
  await page.getByLabel('Mot de passe').fill(CLIENT_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.describe('Client E2E', () => {
  test('login client et voir dashboard avec stats', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT_EMAIL/E2E_CLIENT_PASSWORD non définis')

    await loginClient(page)
    await expect(page).toHaveURL(/\/dashboard\/client/)

    await expect(page.getByText('Mon espace client')).toBeVisible()
    await expect(page.getByText('Total études')).toBeVisible()
    await expect(page.getByText('En attente')).toBeVisible()
  })

  test('formulaire soumission étude sans vrai upload', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT_EMAIL/E2E_CLIENT_PASSWORD non définis')

    await loginClient(page)
    await page.goto('/dashboard/client')

    await page.locator('input#patient-ref').fill('E2E-PAT-001')
    await page.locator('#study-type').click()
    await page.getByRole('option', { name: /PSG/ }).click()

    const submitButton = page.getByRole('button', { name: /Soumettre l’étude/ })
    await expect(submitButton).toBeDisabled()
  })
})
