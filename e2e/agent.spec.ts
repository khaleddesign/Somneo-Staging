import { test, expect } from '@playwright/test'

const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL
const AGENT_PASSWORD = process.env.E2E_AGENT_PASSWORD

async function loginAgent(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(AGENT_EMAIL as string)
  await page.getByLabel('Mot de passe').fill(AGENT_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.describe('Agent E2E', () => {
  test('login agent et voir pool d\'études disponibles', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT_EMAIL/E2E_AGENT_PASSWORD non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    await expect(page.getByRole('heading', { name: /Pool d.études disponibles/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Aucune étude pour le moment').first()).toBeVisible({ timeout: 10000 })
  })

  test('prendre en charge une étude si disponible', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT_EMAIL/E2E_AGENT_PASSWORD non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    const assignButton = page.getByRole('button', { name: 'Prendre en charge' }).first()
    const count = await assignButton.count()
    test.skip(count === 0, 'Aucune étude disponible dans le pool pour assignation')

    await assignButton.click()
    await expect(page.getByText('Assignation...')).toHaveCount(0)
  })

  test('accès à la page détail étude', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT_EMAIL/E2E_AGENT_PASSWORD non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude visible pour accéder au détail')

    await viewLink.click()
    await expect(page.getByText('Dossier Patient')).toBeVisible()
  })
})
