import { describe, expect, it } from 'vitest'

type InviteRole = 'agent' | 'admin' | 'client'

function buildInvitationEmail(params: {
  role: InviteRole
  fullName?: string | null
  signupUrl: string
}) {
  const isAgentLike = params.role === 'agent' || params.role === 'admin'

  const subject = isAgentLike
    ? 'Invitation SomnoConnect - Accès technicien SOMNOVENTIS'
    : 'Invitation SomnoConnect - Portail patient SOMNOVENTIS'

  const html = isAgentLike
    ? `<p>Bonjour${params.fullName ? ` ${params.fullName}` : ''},</p><p>Vous avez été invité à rejoindre SomnoConnect en tant que technicien SOMNOVENTIS.</p><p><a href="${params.signupUrl}">Activer mon compte</a></p>`
    : `<p>Bonjour${params.fullName ? ` ${params.fullName}` : ''},</p><p>Vous avez été invité à accéder au portail SOMNOVENTIS pour vos études du sommeil.</p><p><a href="${params.signupUrl}">Activer mon compte</a></p>`

  return { subject, html }
}

function buildStatusNotification(params: {
  status: 'en_attente' | 'en_cours' | 'termine' | 'annule'
  studyId: string
}) {
  const titleByStatus: Record<typeof params.status, string> = {
    en_attente: 'Étude en attente',
    en_cours: 'Étude en cours de traitement',
    termine: 'Rapport disponible',
    annule: 'Étude annulée',
  }

  return {
    title: titleByStatus[params.status],
    message: `Mise à jour de l'étude ${params.studyId} : ${params.status}`,
  }
}

describe('Notifications and email content', () => {
  it('construit correctement l\'email invitation client', () => {
    const email = buildInvitationEmail({
      role: 'client',
      fullName: 'Client Test',
      signupUrl: 'https://app.somnoventis.com/auth/signup?token=abc',
    })

    expect(email.subject).toContain('Portail patient')
    expect(email.html).toContain('Client Test')
    expect(email.html).toContain('https://app.somnoventis.com/auth/signup?token=abc')
  })

  it('construit correctement l\'email invitation agent', () => {
    const email = buildInvitationEmail({
      role: 'agent',
      fullName: 'Agent Test',
      signupUrl: 'https://app.somnoventis.com/auth/signup?token=xyz',
    })

    expect(email.subject).toContain('technicien')
    expect(email.html).toContain('Agent Test')
    expect(email.html).toContain('rejoindre SomnoConnect')
  })

  it('construit une notification de changement de statut', () => {
    const notification = buildStatusNotification({ status: 'termine', studyId: 'study-123' })

    expect(notification.title).toBe('Rapport disponible')
    expect(notification.message).toContain('study-123')
    expect(notification.message).toContain('termine')
  })
})
