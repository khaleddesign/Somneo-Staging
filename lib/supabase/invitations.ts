import { createAdminClient } from './admin'
import { createClient as createServerClient } from './server'

export type InvitationRow = {
  id: string
  email: string
  full_name: string | null
  token: string
  role_invited: string
  created_by: string
  institution_id: string | null
  expires_at: string | null
  used_at: string | null
  created_at: string
}

export async function createInvitation(params: {
  email: string
  institution_id: string | null
  created_by: string
  full_name?: string | null
  role_invited?: string
}) {
  const { email, institution_id, created_by, full_name = null, role_invited = 'client' } = params

  const server = await createServerClient()

  const token = crypto.randomUUID()

  const { data, error } = await server
    .from('invitations')
    .insert({ email, full_name, token, role_invited, created_by, institution_id })
    .select()
    .single()

  if (error) throw error
  return { token: (data as any).token }
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
  return data as InvitationRow | null
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

  // Create user via admin
  const { data: userData, error: createErr } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  } as any)

  if (createErr) throw createErr

  const userId = (userData as any).user?.id
  if (!userId) throw new Error('Impossible de créer l\'utilisateur')


  // Insert profile in public.profiles (use full_name from invitation if present)
  const { data: profileData, error: profileErr } = await admin
    .from('profiles')
    .insert({
      id: userId,
      email: invitation.email,
      full_name: invitation.full_name ?? null,
      role: 'client',
      institution_id: invitation.institution_id,
      is_active: true,
    })
    .select()
    .single()

  if (profileErr) throw profileErr

  // Mark invitation used
  const { data: usedData, error: usedErr } = await admin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .select()
    .single()

  if (usedErr) throw usedErr

  return { userId, profile: profileData }
}
