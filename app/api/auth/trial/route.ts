import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { limiters } from '@/lib/rateLimit'

type Body = {
  full_name?: string
  email?: string
  password?: string
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await limiters.trial.check(`trial:${ip}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: rl.headers }
    )
  }

  try {
    const body: Body = await req.json()
    const { full_name, password } = body
    // Normalize email once
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!full_name?.trim() || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Create auth user — Supabase rejects duplicate emails natively, no pre-check needed
    const { data: userData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createErr) {
      // Map Supabase auth errors to user-safe messages
      const msg = createErr.message.toLowerCase()
      if (msg.includes('already') || msg.includes('exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Unable to create account.' }, { status: 400 })
    }

    const userId = userData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
    }

    // Create profile with client role
    const { error: profileErr } = await admin
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: full_name.trim(),
        role: 'client',
        institution_id: null,
        is_active: true,
      })

    if (profileErr) {
      // Rollback: delete the auth user so nothing is left orphaned
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Unable to create account.' }, { status: 500 })
    }

    // Auto sign-in
    const supabase = await createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (signInErr) {
      return NextResponse.json({ success: true, redirect: '/auth/login?message=account_created' })
    }

    return NextResponse.json({ success: true, redirect: '/dashboard/client' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
