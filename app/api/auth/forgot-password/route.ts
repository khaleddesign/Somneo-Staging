import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const RESET_REDIRECT_URL = `${APP_URL}/auth/reset-password`

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Service email indisponible' }, { status: 500 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: RESET_REDIRECT_URL,
      },
    })

    const tokenHash = data?.properties?.hashed_token
    const customResetLink = tokenHash
      ? `${RESET_REDIRECT_URL}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
      : data?.properties?.action_link

    if (!error && customResetLink) {
      await resend.emails.send({
        from: 'SomnoConnect <no-reply@somnoventis.com>',
        to: email,
        subject: 'Réinitialisation de votre mot de passe SomnoConnect',
        html: `
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p><a href="${customResetLink}">Réinitialiser mon mot de passe</a></p>
          <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
