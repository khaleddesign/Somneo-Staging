import { NextResponse } from 'next/server'
import { createUserAndProfileFromInvitation } from '@/lib/supabase/invitations'
import { createClient } from '@/lib/supabase/server'

type Body = {
  token?: string
  password?: string
}

export async function POST(req: Request) {
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
      password: body.password,
    })

    if (signInError) {
      // Connexion échouée mais compte créé — redirige vers login
      return NextResponse.json({ 
        success: true, 
        redirect: '/auth/login?message=compte_cree'
      })
    }

    return NextResponse.json({ 
      success: true, 
      redirect: '/dashboard/client' 
    })
  } catch (err: any) {
    const message = err?.message ?? 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
