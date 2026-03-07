import { createAdminClient } from './admin'
import { createClient as createServerClient } from './server'
import type { Database } from '@/types/database'

export type InvitationRow = Database['public']['Tables']['invitations']['Row']

export async function createInvitation(params: {
  email: string
  institution_id: string | null
  created_by: string
  full_name?: string | null
  role_invited?: 'admin' | 'agent' | 'client'
}) {
  const { email, institution_id, created_by, full_name = null, role_invited = 'client' } = params

  const server = await createServerClient()

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await server
    .from('invitations')
    .insert({ email, full_name, token, role_invited, created_by, institution_id, expires_at: expiresAt })
    .select()
    .single()

  if (error) throw error
  const invitation = data as InvitationRow
  return { token: invitation.token }
}

export async function getInvitationByToken(token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('used_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new Error('Invitation expirée')
  }

  return data as InvitationRow
}

export async function markInvitationUsed(id: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as InvitationRow
}

export async function createUserAndProfileFromInvitation(token: string, password: string) {
  const admin = createAdminClient()

  // fetch invitation
  const { data: invitation, error: invErr } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (invErr) throw invErr
  if (!invitation) throw new Error('Token invalide')
  if (invitation.used_at) throw new Error('Token déjà utilisé')
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation expirée')
  }

  // Create user via admin
  const { data: userData, error: createErr } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  })

  if (createErr) throw createErr

  const userId = userData.user?.id
  if (!userId) throw new Error('Impossible de créer l\'utilisateur')


  // Insert profile in public.profiles (use full_name from invitation if present)
  const invitedRole = ['admin', 'agent', 'client'].includes(invitation.role_invited)
    ? invitation.role_invited
    : 'client'

  const { data: profileData, error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: userId,
      email: invitation.email,
      full_name: invitation.full_name ?? null,
      role: invitedRole,
      institution_id: invitation.institution_id,
      is_active: true,
    })
    .select()
    .single()

  if (profileErr) throw profileErr

  // Mark invitation used
  const { error: usedErr } = await admin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .select()
    .single()

  if (usedErr) throw usedErr

  return { userId, profile: profileData, role: invitedRole as 'admin' | 'agent' | 'client' }
}
