import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'khaledsopra@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
}

test.describe('Auth E2E', () => {
  test('login admin puis redirection /dashboard/admin', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD as string)
    await expect(page).toHaveURL(/\/dashboard\/admin/)
    await expect(page.getByText('Tour de contrôle')).toBeVisible()
  })

  test('login mauvais mot de passe affiche un message erreur', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Mot de passe').fill('bad-password-123')
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page.getByText('Email ou mot de passe incorrect.')).toBeVisible()
  })

  test('logout redirige vers /auth/login', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD as string)
    await expect(page).toHaveURL(/\/dashboard\/admin/)

    await page.getByRole('button', { name: /Déconnexion/ }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
