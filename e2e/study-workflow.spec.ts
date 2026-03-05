import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

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

test.describe('Study Workflow E2E', () => {
  test('Agent prend en charge une étude → statut passe en_cours', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    // Vérifier qu'il y a des études dans le pool
    const assignBtn = page.getByRole('button', { name: 'Prendre en charge' }).first()
    const count = await assignBtn.count()
    test.skip(count === 0, 'Aucune étude disponible dans le pool')

    await assignBtn.click()

    // Attendre que le bouton disparaisse (assignation terminée)
    await expect(assignBtn).not.toBeVisible({ timeout: 10000 })

    // Un lien "Voir" doit apparaître dans "Mes études en cours"
    await expect(page.getByRole('link', { name: 'Voir' }).first()).toBeVisible({ timeout: 8000 })
  })

  test('Agent accède à une étude assignée et voit les actions', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude assignée à cet agent')

    await viewLink.click()
    await expect(page).toHaveURL(/\/dashboard\/agent\/studies\//, { timeout: 8000 })
    await expect(page.getByText('Dossier Patient')).toBeVisible()
    await expect(page.getByText('Uploader le rapport PDF')).toBeVisible()
  })

  test('Agent uploade un rapport PDF → message succès', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAgent(page)
    await page.goto('/dashboard/agent/studies')

    const viewLink = page.getByRole('link', { name: 'Voir' }).first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude assignée pour upload')

    await viewLink.click()
    await expect(page).toHaveURL(/\/dashboard\/agent\/studies\//)

    // Créer un PDF temporaire minimal
    const tmpPdf = path.join(os.tmpdir(), 'e2e-rapport.pdf')
    fs.writeFileSync(tmpPdf, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n')

    // Upload
    const fileInput = page.locator('input[type="file"][accept=".pdf,application/pdf"]')
    const uploadSection = page.getByText('Uploader le rapport PDF')
    const sectionVisible = await uploadSection.isVisible()
    test.skip(!sectionVisible, 'Section upload non visible (étude peut-être déjà terminée)')

    await fileInput.setInputFiles(tmpPdf)
    await page.getByRole('button', { name: 'Uploader' }).click()

    await expect(page.getByText(/Rapport PDF uploadé et étude marquée comme terminée/)).toBeVisible({ timeout: 15000 })

    fs.unlinkSync(tmpPdf)
  })

  test('Client voit le rapport disponible sur son étude', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginClient(page)
    await page.goto('/dashboard/client')

    // Chercher une étude terminée
    const viewLink = page.locator('a[href*="/dashboard/client/studies/"]').first()
    const count = await viewLink.count()
    test.skip(count === 0, 'Aucune étude visible pour ce client')

    await viewLink.click()
    await expect(page).toHaveURL(/\/dashboard\/client\/studies\//)

    // Si l'étude est terminée avec rapport, le lien doit être visible
    const reportLink = page.getByText(/Voir le rapport PDF|Télécharger le rapport/)
    const hasReport = await reportLink.count()
    test.skip(hasReport === 0, 'Pas de rapport disponible sur cette étude')

    await expect(reportLink.first()).toBeVisible()
  })

  test('Client ne peut pas voir les études des autres clients', async ({ page }) => {
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    await loginClient(page)

    // Essayer d'accéder à une étude avec un ID aléatoire (UUID invalide)
    await page.goto('/dashboard/client/studies/00000000-0000-0000-0000-000000000000')

    // Doit retourner 404
    await expect(page.getByText(/404|introuvable|not found/i).first()).toBeVisible({ timeout: 8000 })
  })
})
