import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mail'

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

    const { success, id, error } = await sendEmail({
      to: email,
      subject,
      html: message
    })

    if (!success) {
      return NextResponse.json({ 
        error: 'Erreur lors de l\'envoi du mail', 
        details: typeof error === 'object' ? (error as any).message : error 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    console.error('[notifications] erreur', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur interne' }, { status: 500 })
  }
}
