import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvitation } from '@/lib/supabase/invitations'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type InviteRole = 'admin' | 'agent' | 'client'

interface Body {
  email?: string
  full_name?: string
  role?: InviteRole
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const email = body.email?.trim().toLowerCase()
    const fullName = body.full_name?.trim() || null
    const role: InviteRole = body.role && ['admin', 'agent', 'client'].includes(body.role) ? body.role : 'client'

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: caller, error: callerError } = await supabase
      .from('profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (callerError || !caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let institutionId = caller.institution_id || null

    if (!institutionId) {
      const { data: firstInstitution } = await supabase
        .from('institutions')
        .select('id')
        .limit(1)
        .maybeSingle()

      institutionId = firstInstitution?.id || null
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'Aucune institution disponible' }, { status: 400 })
    }

    const { token } = await createInvitation({
      email,
      full_name: fullName,
      institution_id: institutionId,
      created_by: user.id,
      role_invited: role,
    })

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
        console.error('Resend Error:', emailError)
        const resendMessage = emailError.message || 'Erreur envoi email Resend'
        return NextResponse.json({ error: resendMessage }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, token })
  } catch (err: unknown) {
    console.error('Resend Error:', err)
    console.error('[POST /api/invite]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
