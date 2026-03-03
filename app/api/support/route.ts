import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

interface Body {
  subject?: string
  message?: string
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const subject = body.subject?.trim()
    const message = body.message?.trim()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const userEmail = user.email
    if (!userEmail) {
      return NextResponse.json({ error: 'Email utilisateur introuvable' }, { status: 400 })
    }

    const userName = profile?.full_name || 'Utilisateur SomnoConnect'

    const supportEmail = await resend.emails.send({
      from: 'no-reply@somnoventis.com',
      to: 'contact@somnoventis.com',
      subject: `[Support SomnoConnect] ${subject}`,
      html: `
        <p><strong>Expéditeur :</strong> ${userName} (${userEmail})</p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <p><strong>Message :</strong></p>
        <p>${message.replace(/\n/g, '<br />')}</p>
      `,
    })

    if (supportEmail.error) {
      return NextResponse.json({ error: supportEmail.error.message }, { status: 500 })
    }

    const confirmationEmail = await resend.emails.send({
      from: 'no-reply@somnoventis.com',
      to: userEmail,
      subject: 'SomnoConnect - Confirmation de votre demande support',
      html: `
        <p>Bonjour ${userName},</p>
        <p>Nous avons bien reçu votre demande :</p>
        <p><strong>${subject}</strong></p>
        <p>${message.replace(/\n/g, '<br />')}</p>
        <p>Notre équipe vous répondra rapidement.</p>
      `,
    })

    if (confirmationEmail.error) {
      return NextResponse.json({ error: confirmationEmail.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
