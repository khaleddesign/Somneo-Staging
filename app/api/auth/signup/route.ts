import { NextResponse } from 'next/server'
import { createUserAndProfileFromInvitation } from '@/lib/supabase/invitations'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type Body = {
  token?: string
  password?: string
}

const SIGNUP_LIMIT = 5
const SIGNUP_WINDOW = 15 * 60 * 1000 // 15 min

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      { status: 429, headers: rateLimitHeaders(SIGNUP_WINDOW, SIGNUP_LIMIT) }
    )
  }

  try {
    const body: Body = await req.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 })
    }

    // Create user and profile using admin client
    const result = await createUserAndProfileFromInvitation(token, password)

    // Connexion automatique
    const supabase = await createClient()
    const invitation = result?.profile ? result.profile : null
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: invitation?.email,
      password: password,
    })

    if (signInError) {
      // Connexion échouée mais compte créé — redirige vers login
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
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
