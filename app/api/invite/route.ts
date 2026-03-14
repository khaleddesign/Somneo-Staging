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
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 },
      )
    }
    const email = parsed.data.email
    const fullName = parsed.data.full_name ?? null
    const role = parsed.data.role

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: caller, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, institution_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (!caller.institution_id) {
      return NextResponse.json({ error: 'Compte admin sans institution' }, { status: 400 })
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
      return NextResponse.json({ error: `Échec création invitation : ${msg}` }, { status: 500 })
    }

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?token=${token}`

    const isAgentLike = role === 'agent' || role === 'admin'
    const subject = isAgentLike
      ? 'Invitation SomnoConnect - Accès technicien SOMNOVENTIS'
      : 'Invitation SomnoConnect - Portail patient SOMNOVENTIS'

    const html = isAgentLike
      ? `<p>Bonjour${fullName ? ` ${fullName}` : ''},</p>
         <p>Vous avez été invité à rejoindre SomnoConnect en tant que technicien SOMNOVENTIS.</p>
         <p><a href="${signupUrl}">Activer mon compte</a></p>
         <p>Ce lien est personnel et sécurisé.</p>`
      : `<p>Bonjour${fullName ? ` ${fullName}` : ''},</p>
         <p>Vous avez été invité à accéder au portail SOMNOVENTIS pour vos études du sommeil.</p>
         <p><a href="${signupUrl}">Activer mon compte</a></p>
         <p>Ce lien est personnel et sécurisé.</p>`

    if (process.env.RESEND_API_KEY) {
      const { error: emailError } = await resend.emails.send({
        from: 'SomnoConnect <noreply@somnoventis.com>',
        to: email,
        subject,
        html,
      })

      if (emailError) {
        console.error('[POST /api/invite] Resend error:', emailError)
        return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'invitation' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, token })
  } catch (error: unknown) {
    console.error('[POST /api/invite] unhandled error', error)
    return NextResponse.json({ error: 'Une erreur est survenue lors de la création de l\'invitation' }, { status: 500 })
  }
}
