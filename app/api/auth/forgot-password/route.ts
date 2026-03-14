import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { limiters } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const RESET_REDIRECT_URL = `${APP_URL}/auth/reset-password`

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await limiters.forgotPassword.check(`forgot:${ip}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429, headers: rl.headers }
    )
  }

  try {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service unavailable' }, { status: 500 })
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
        subject: 'Reset your SomnoConnect password',
        html: `
          <p>Hello,</p>
          <p>You requested a password reset.</p>
          <p><a href="${customResetLink}">Reset my password</a></p>
          <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
