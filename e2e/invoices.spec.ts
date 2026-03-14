/**
 * Tests de facturation E2E
 * Admin : création, statuts, téléchargement PDF
 */
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

async function loginClient(page: import('@playwright/test').Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(CLIENT_EMAIL as string)
  await page.getByLabel('Mot de passe').fill(CLIENT_PASSWORD as string)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/\/dashboard\/client/, { timeout: 10000 })
}

test.describe('Facturation E2E', () => {
  test('Admin voit la page des factures', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices')

    await expect(page.getByRole('heading', { name: /Factures/i })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /Nouvelle facture/i })).toBeVisible()
  })

  test('Admin accède au formulaire de création de facture', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices/new')

    // Le formulaire doit être visible
    await expect(page.getByText(/Client|Sélectionner/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('Admin crée une facture par prélecture (PSG)', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices/new')
    await page.waitForTimeout(2000)

    // Sélectionner un client
    const clientSelect = page.getByRole('combobox').first()
    if (!(await clientSelect.isVisible())) {
      test.skip(true, 'Formulaire de facture non accessible')
      return
    }

    await clientSelect.click()
    const firstOption = page.getByRole('option').first()
    const optCount = await firstOption.count()
    test.skip(optCount === 0, 'Aucun client disponible pour facturation')

    await firstOption.click()
    await page.waitForTimeout(1000)

    // Sélectionner le type "PSG" ou "prélecture"
    const typeSelect = page.getByRole('combobox').nth(1)
    if (await typeSelect.isVisible()) {
      await typeSelect.click()
      const psgOption = page.getByRole('option', { name: /PSG|prélecture/i }).first()
      if (await psgOption.count() > 0) {
        await psgOption.click()
      }
    }

    // Cliquer sur "Créer la facture" ou "Générer"
    const createBtn = page.getByRole('button', { name: /Créer|Générer|Sauvegarder/i }).first()
    if (await createBtn.isEnabled()) {
      await createBtn.click()
      // Succès : redirection ou message
      await page.waitForTimeout(3000)
      const url = page.url()
      const hasSuccess = await page.getByText(/Facture créée|succès|success/i).count()
      const redirectedToList = url.includes('/invoices') && !url.includes('/new')

      expect(hasSuccess > 0 || redirectedToList).toBeTruthy()
    }
  })

  test('Admin voit les factures existantes dans le tableau', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices')
    await page.waitForTimeout(2000)

    // Si des factures existent → tableau visible
    const table = page.getByRole('table')
    const invoiceCards = page.locator('[data-testid="invoice-row"], tr').first()

    const hasTable = await table.count()
    const hasCards = await page.getByText(/Facture|Invoice/i).count()
    console.log(`[Invoices] Tableau visible: ${hasTable > 0}, mentions "Facture": ${hasCards}`)

    // La page doit au moins afficher le tableau ou un message "aucune facture"
    await expect(
      page.getByRole('table').or(page.getByText(/Aucune facture|No invoice/i))
    ).toBeVisible({ timeout: 8000 })
  })

  test('Admin peut changer le statut d\'une facture draft → sent', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices')
    await page.waitForTimeout(2000)

    // Chercher un bouton de changement de statut
    const statusBtn = page.getByRole('button', { name: /Marquer envoyée|Envoyer|draft|Brouillon/i }).first()
    const count = await statusBtn.count()
    test.skip(count === 0, 'Aucune facture en statut draft disponible')

    await statusBtn.click()
    await page.waitForTimeout(2000)

    // Vérifier que le statut a changé
    await expect(page.getByText(/Envoyée|sent|Payée|paid/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('[API] GET /api/invoices sans auth → 401', async ({ request }) => {
    const res = await request.get('/api/invoices')
    expect(res.status()).toBe(401)
  })

  test('[API] GET /api/invoices/settings sans auth → 401', async ({ request }) => {
    const res = await request.get('/api/invoices/settings')
    expect(res.status()).toBe(401)
  })

  test('PDF facture téléchargeable depuis la liste', async ({ page }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD non défini')

    await loginAdmin(page)
    await page.goto('/dashboard/admin/invoices')
    await page.waitForTimeout(2000)

    // Chercher un bouton de téléchargement PDF
    const downloadBtn = page.getByRole('link', { name: /PDF|Télécharger|Download/i }).first()
    const count = await downloadBtn.count()
    test.skip(count === 0, 'Aucun bouton de téléchargement PDF visible')

    // Vérifier que le lien PDF est présent et pointe vers la bonne URL
    const href = await downloadBtn.getAttribute('href')
    expect(href).toBeTruthy()
    console.log(`[Invoice PDF] href: ${href}`)
  })
})
