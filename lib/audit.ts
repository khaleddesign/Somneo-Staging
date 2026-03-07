import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

/**
 * Enregistre une action dans la table audit_logs (immuable, via service role).
 * Ne bloque jamais le flux principal en cas d'échec.
 */
export async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: object,
): Promise<void> {
  try {
    const admin = createAdminClient()
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      null
    const userAgent = headersList.get('user-agent') || null

    await admin.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      ip_address: ip,
      user_agent: userAgent,
      metadata: metadata ?? {},
    })
  } catch (err) {
    console.error('[audit] logAudit failed:', err)
  }
}
