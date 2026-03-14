import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvitation } from '@/lib/supabase/invitations'
import { Resend } from 'resend'
import { inviteSchema } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = inviteSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid data' },
        { status: 400 },
      )
    }
    const email = parsed.data.email
    const fullName = parsed.data.full_name ?? null
    const role = parsed.data.role

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: caller, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, institution_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!caller.institution_id) {
      return NextResponse.json({ error: 'Admin account has no institution' }, { status: 400 })
    }

    let token: string
    try {
      const result = await createInvitation({
        email,
        full_name: fullName,
        institution_id: caller.institution_id,
        created_by: user.id,
        role_invited: role,
      })
      token = result.token
    } catch (invErr: unknown) {
      console.error('[POST /api/invite] createInvitation failed', invErr)
      const msg = invErr instanceof Error ? invErr.message : String(invErr)
      return NextResponse.json({ error: `Failed to create invitation: ${msg}` }, { status: 500 })
    }

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?token=${token}`

    const isAgentLike = role === 'agent' || role === 'admin'
    const subject = isAgentLike
      ? 'SomnoConnect Invitation - SOMNOVENTIS Technician Access'
      : 'SomnoConnect Invitation - SOMNOVENTIS Patient Portal'

    const html = isAgentLike
      ? `<p>Hello${fullName ? ` ${fullName}` : ''},</p>
         <p>You have been invited to join SomnoConnect as a SOMNOVENTIS technician.</p>
         <p><a href="${signupUrl}">Activate my account</a></p>
         <p>This link is personal and secure.</p>`
      : `<p>Hello${fullName ? ` ${fullName}` : ''},</p>
         <p>You have been invited to access the SOMNOVENTIS portal for your sleep studies.</p>
         <p><a href="${signupUrl}">Activate my account</a></p>
         <p>This link is personal and secure.</p>`

    if (process.env.RESEND_API_KEY) {
      const { error: emailError } = await resend.emails.send({
        from: 'SomnoConnect <noreply@somnoventis.com>',
        to: email,
        subject,
        html,
      })

      if (emailError) {
        console.error('[POST /api/invite] Resend error:', emailError)
        return NextResponse.json({ error: 'Error sending invitation' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, token })
  } catch (error: unknown) {
    console.error('[POST /api/invite] unhandled error', error)
    return NextResponse.json({ error: 'An error occurred while creating the invitation' }, { status: 500 })
  }
}
