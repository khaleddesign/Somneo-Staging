import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!);

interface Body {
  email?: string
  subject?: string
  message?: string
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const { email, subject, message } = body

    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'email, subject et message requis' }, { status: 400 })
    }

    // envoi mail via Resend
    await resend.emails.send({
      from: 'no-reply@somnoventis.com',
      to: email,
      subject,
      html: message,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[notifications] erreur', err)
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 })
  }
}
