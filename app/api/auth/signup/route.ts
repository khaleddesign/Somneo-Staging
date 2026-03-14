import { NextResponse } from 'next/server'
import { createUserAndProfileFromInvitation } from '@/lib/supabase/invitations'
import { createClient } from '@/lib/supabase/server'
import { limiters } from '@/lib/rateLimit'

type Body = {
  token?: string
  password?: string
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const rl = await limiters.signup.check(`signup:${ip}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429, headers: rl.headers }
    )
  }

  try {
    const body: Body = await req.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    // Create user and profile using admin client
    const result = await createUserAndProfileFromInvitation(token, password)

    // Sign in automatique
    const supabase = await createClient()
    const invitation = result?.profile ? result.profile : null
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation?.email,
      password: password,
    })

    if (signInError) {
      // Sign in échouée mais compte créé — redirige vers login
      return NextResponse.json({ 
        success: true, 
        redirect: '/auth/login?message=compte_cree'
      })
    }

    const role = result?.role || result?.profile?.role
    const redirect = role === 'admin'
      ? '/dashboard/admin'
      : role === 'agent'
        ? '/dashboard/agent'
        : '/dashboard/client'

    return NextResponse.json({
      success: true,
      redirect,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
