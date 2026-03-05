import { test, expect, Browser } from '@playwright/test'

const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL
const AGENT_PASSWORD = process.env.E2E_AGENT_PASSWORD
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD

async function loginAs(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp,
) {
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(expectedUrlPattern, { timeout: 10000 })
}

/** Retourne l'ID de la première étude visible sur la page agent/studies */
async function getFirstStudyId(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/dashboard/agent/studies')
  const link = page.getByRole('link', { name: 'Voir' }).first()
  const count = await link.count()
  if (count === 0) return null
  const href = await link.getAttribute('href')
  return href ? href.split('/').pop() || null : null
}

test.describe('Messagerie E2E', () => {
  test('Interface de discussion visible sur une étude agent', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)

    const studyId = await getFirstStudyId(page)
    test.skip(!studyId, 'Aucune étude assignée à cet agent')

    await page.goto(`/dashboard/agent/studies/${studyId}`)
    await expect(page.getByText('Discussion')).toBeVisible({ timeout: 8000 })
    await expect(page.getByPlaceholder('Écrivez votre message...')).toBeVisible()
  })

  test('Agent envoie un message → message apparaît dans le fil', async ({ page }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')

    await loginAs(page, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)

    const studyId = await getFirstStudyId(page)
    test.skip(!studyId, 'Aucune étude assignée')

    await page.goto(`/dashboard/agent/studies/${studyId}`)

    const input = page.getByPlaceholder('Écrivez votre message...')
    const msg = `Message E2E agent ${Date.now()}`
    await input.fill(msg)
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click() // bouton Send

    await expect(page.getByText(msg)).toBeVisible({ timeout: 8000 })
  })

  test('Client voit le message de l\'agent sur la même étude', async ({ browser }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    // Contexte agent : envoie un message
    const agentCtx = await (browser as Browser).newContext()
    const agentPage = await agentCtx.newPage()

    await loginAs(agentPage, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const studyId = await getFirstStudyId(agentPage)

    if (!studyId) {
      await agentCtx.close()
      test.skip(true, 'Aucune étude assignée à cet agent')
      return
    }

    await agentPage.goto(`/dashboard/agent/studies/${studyId}`)
    const msg = `Message E2E agent→client ${Date.now()}`
    await agentPage.getByPlaceholder('Écrivez votre message...').fill(msg)
    await agentPage.getByRole('button').filter({ has: agentPage.locator('svg') }).last().click()
    await expect(agentPage.getByText(msg)).toBeVisible({ timeout: 8000 })
    await agentCtx.close()

    // Contexte client : cherche l'étude et vérifie le message
    const clientCtx = await (browser as Browser).newContext()
    const clientPage = await clientCtx.newPage()

    await loginAs(clientPage, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    await clientPage.goto(`/dashboard/client/studies/${studyId}`)

    // Si la page retourne 404 (étude d'un autre client), on skip
    const is404 = await clientPage.getByText(/404|introuvable/i).count()
    if (is404 > 0) {
      await clientCtx.close()
      test.skip(true, 'Cette étude n\'appartient pas à ce client')
      return
    }

    await expect(clientPage.getByText(msg)).toBeVisible({ timeout: 10000 })
    await clientCtx.close()
  })

  test('Client répond et l\'agent voit la réponse', async ({ browser }) => {
    test.skip(!AGENT_EMAIL || !AGENT_PASSWORD, 'E2E_AGENT credentials non définis')
    test.skip(!CLIENT_EMAIL || !CLIENT_PASSWORD, 'E2E_CLIENT credentials non définis')

    // Trouver l'ID de l'étude depuis le contexte agent
    const agentCtx = await (browser as Browser).newContext()
    const agentPage = await agentCtx.newPage()
    await loginAs(agentPage, AGENT_EMAIL as string, AGENT_PASSWORD as string, /\/dashboard\/agent/)
    const studyId = await getFirstStudyId(agentPage)

    if (!studyId) {
      await agentCtx.close()
      test.skip(true, 'Aucune étude disponible')
      return
    }

    // Contexte client : envoie une réponse
    const clientCtx = await (browser as Browser).newContext()
    const clientPage = await clientCtx.newPage()
    await loginAs(clientPage, CLIENT_EMAIL as string, CLIENT_PASSWORD as string, /\/dashboard\/client/)
    await clientPage.goto(`/dashboard/client/studies/${studyId}`)

    const is404 = await clientPage.getByText(/404|introuvable/i).count()
    if (is404 > 0) {
      await agentCtx.close()
      await clientCtx.close()
      test.skip(true, 'Étude non accessible par ce client')
      return
    }

    const reply = `Réponse client E2E ${Date.now()}`
    await clientPage.getByPlaceholder('Écrivez votre message...').fill(reply)
    await clientPage.getByRole('button').filter({ has: clientPage.locator('svg') }).last().click()
    await expect(clientPage.getByText(reply)).toBeVisible({ timeout: 8000 })
    await clientCtx.close()

    // Agent rafraîchit et voit la réponse
    await agentPage.goto(`/dashboard/agent/studies/${studyId}`)
    await expect(agentPage.getByText(reply)).toBeVisible({ timeout: 10000 })
    await agentCtx.close()
  })
})
