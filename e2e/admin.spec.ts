import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'khaledsopra@gmail.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD

async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/admin/, { timeout: 10000 })
}

test.describe('Admin E2E', () => {
  test('Admin voit le dashboard Tour de contrôle avec les KPIs', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin')

    await expect(page.getByRole('heading', { name: /Tour de contrôle/i })).toBeVisible({ timeout: 8000 })

    // Au moins un des KPI cards doit être visible
    await expect(page.getByText('Total agents actifs')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Total clients actifs')).toBeVisible()
    await expect(page.getByText('Total études')).toBeVisible()
  })

  test('Admin voit la liste des agents dans Gestion des agents', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/agents')

    await expect(page.getByRole('heading', { name: /Gestion des agents/i })).toBeVisible({ timeout: 8000 })

    // Tableau d'agents visible
    await expect(page.getByText('Nom', { exact: true })).toBeVisible()
    await expect(page.getByText('Email', { exact: true })).toBeVisible()
    await expect(page.getByText('Statut', { exact: true })).toBeVisible()
  })

  test('Admin voit la liste des clients dans Gestion des clients', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/clients')

    await expect(page.getByRole('heading', { name: /Gestion des clients/i })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /Inviter un client/ })).toBeVisible()
  })

  test('Admin peut suspendre puis réactiver un client', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/clients')

    await page.waitForTimeout(2000) // attendre chargement des clients

    // Chercher un bouton "Suspendre" (client actif)
    const suspendBtn = page.getByRole('button', { name: /^Suspendre$/ }).first()
    const count = await suspendBtn.count()
    test.skip(count === 0, 'Aucun client actif à suspendre')

    await suspendBtn.click()
    await page.waitForTimeout(1500) // attendre rechargement

    // Le statut doit afficher "Suspendu" quelque part dans la table
    await expect(page.getByText('Suspendu').first()).toBeVisible({ timeout: 8000 })

    // Réactiver immédiatement pour ne pas laisser l'état altéré
    const reactivateBtn = page.getByRole('button', { name: /Réactiver/ }).first()
    const reactivateCount = await reactivateBtn.count()
    if (reactivateCount > 0) {
      await reactivateBtn.click()
      await page.waitForTimeout(1000)
    }
  })

  test('Admin voit les études et peut accéder au détail', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/studies')

    await expect(page.getByRole('heading', { name: /Toutes les études/i })).toBeVisible({ timeout: 8000 })

    // Si des études existent, vérifier qu'un lien Voir est accessible
    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude disponible')

    await viewLink.click()
    await expect(page).toHaveURL(/\/dashboard\/admin\/studies\//, { timeout: 8000 })

    // Dossier patient visible
    await expect(page.getByText('Dossier Patient')).toBeVisible()
  })

  test('Admin peut rechercher un agent par nom', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/agents')

    await page.waitForTimeout(1500)

    // Saisir dans le champ de recherche
    const searchInput = page.getByPlaceholder('Rechercher un agent')
    await expect(searchInput).toBeVisible({ timeout: 8000 })
    await searchInput.fill('zzz_inexistant_xyz')

    // Le tableau doit afficher "Aucun agent"
    await expect(page.getByText('Aucun agent')).toBeVisible({ timeout: 5000 })

    // Vider la recherche → agents réapparaissent (si il y en a)
    await searchInput.fill('')
  })
})
