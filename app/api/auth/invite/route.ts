import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvitation } from '@/lib/supabase/invitations'

type Body = {
  email?: string
  institution_id?: string | null
  full_name?: string | null
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json()
    const { email, institution_id, full_name } = body

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const server = await createClient()
    const { data: userData, error: userErr } = await server.auth.getUser()
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = userData.user.id

    // Vérifie le rôle
    const { data: profile, error: profErr } = await server
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profErr) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    const role = (profile as any)?.role
    if (!role || !['agent', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }

    const result = await createInvitation({
      email,
      institution_id: institution_id ?? null,
      full_name: full_name ?? null,
      created_by: userId,
    })

    return NextResponse.json({ success: true, token: result.token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erreur interne' }, { status: 500 })
  }
}
