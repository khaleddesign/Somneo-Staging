import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/mail'

/**
 * POST /api/studies/{id}/report-notify
 * Called after a batch report upload to notify the study's client.
 * Only accessible by agents and admins.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Verify caller is agent or admin
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!callerProfile || !['agent', 'admin'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get study basic info, then client profile separately (avoids join typing issues)
    const { data: study } = await admin
      .from('studies')
      .select('id, patient_reference, client_id')
      .eq('id', id)
      .maybeSingle()

    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    const { data: clientProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', study.client_id)
      .maybeSingle()

    const clientEmail = clientProfile?.email
    if (!clientEmail) {
      return NextResponse.json({ success: true, sent: false }) // no email, skip silently
    }

    await sendEmail({
      to: clientEmail,
      subject: 'SomnoConnect — Votre rapport d\'analyse est disponible',
      html: `
        <p>Bonjour${clientProfile?.full_name ? ` ${clientProfile.full_name}` : ''},</p>

        <p>Le rapport d'analyse de votre étude (<strong>${study.patient_reference}</strong>)
        est maintenant disponible dans votre espace client SomnoConnect.</p>
        <p>Merci de votre confiance.</p>
        <p>— L'équipe SOMNOVENTIS</p>
      `,
    })

    return NextResponse.json({ success: true, sent: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
