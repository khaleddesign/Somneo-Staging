import { describe, expect, it } from 'vitest'

type Role = 'admin' | 'agent' | 'client'

type Profile = {
  email: string
  full_name: string | null
  role: Role
  is_active: boolean
}

function isValidInvitationToken(token: string): boolean {
  const normalized = token.trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
}

function buildProfileFromRole(params: {
  email: string
  full_name?: string | null
  role_invited?: string
}): Profile {
  const allowedRoles: Role[] = ['admin', 'agent', 'client']
  const role = allowedRoles.includes(params.role_invited as Role)
    ? (params.role_invited as Role)
    : 'client'

  return {
    email: params.email.trim().toLowerCase(),
    full_name: params.full_name ?? null,
    role,
    is_active: true,
  }
}

function getRedirectAfterLogin(params: { role: Role; is_suspended?: boolean }): string {
  if (params.is_suspended) return '/auth/suspended'
  if (params.role === 'admin') return '/dashboard/admin'
  if (params.role === 'agent') return '/dashboard/agent'
  return '/dashboard/client'
}

describe('Auth flows', () => {
  it('valide un token invitation UUID', () => {
    expect(isValidInvitationToken('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidInvitationToken('invalid-token')).toBe(false)
  })

  it('crée un profil selon le rôle invité (agent/client)', () => {
    const agentProfile = buildProfileFromRole({
      email: 'AGENT@SOMNO.COM',
      full_name: 'Agent Test',
      role_invited: 'agent',
    })

    const clientProfile = buildProfileFromRole({
      email: 'client@somno.com',
      full_name: 'Client Test',
      role_invited: 'client',
    })

    expect(agentProfile.role).toBe('agent')
    expect(agentProfile.email).toBe('agent@somno.com')
    expect(clientProfile.role).toBe('client')
  })

  it('redirige correctement après login selon rôle', () => {
    expect(getRedirectAfterLogin({ role: 'admin' })).toBe('/dashboard/admin')
    expect(getRedirectAfterLogin({ role: 'agent' })).toBe('/dashboard/agent')
    expect(getRedirectAfterLogin({ role: 'client' })).toBe('/dashboard/client')
    expect(getRedirectAfterLogin({ role: 'client', is_suspended: true })).toBe('/auth/suspended')
  })
})
