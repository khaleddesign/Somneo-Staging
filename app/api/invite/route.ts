import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvitation } from '@/lib/supabase/invitations'
import { Resend } from 'resend'
import { inviteSchema } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = inviteSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 },
      )
    }
    const email = parsed.data.email
    const fullName = parsed.data.full_name ?? null
    const role = parsed.data.role

    const supabase = await createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    let authProfile: { id: string; email: string; role: string; institution_id: string | null } | null = null
    let authProfileError: string | null = null

    if (user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, institution_id')
        .eq('id', user.id)
        .maybeSingle()

      authProfile = profileData
      authProfileError = profileError?.message || null
    }

    if (userError || !user) {
      console.error('[POST /api/invite] 401 debug', {
        sessionExists: Boolean(session),
        sessionUserId: session?.user?.id ?? null,
        sessionError: sessionError?.message ?? null,
        user: user ? { id: user.id, email: user.email } : null,
        userError: userError?.message ?? null,
        profile: authProfile,
        profileError: authProfileError,
      })
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const caller = authProfile
    const callerError = authProfile ? null : { message: authProfileError || 'Profil introuvable' }

    if (callerError || !caller || caller.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let institutionId = caller.institution_id || null

    if (!institutionId) {
      const { data: firstInstitution, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .limit(1)
        .maybeSingle()

      console.error('[POST /api/invite] institution lookup', {
        callerInstitutionId: caller.institution_id,
        firstInstitution,
        instError: instError?.message ?? null,
      })

      institutionId = firstInstitution?.id || null
    }

    // Fallback sûr : on autorise institution_id null si la table est vide
    // (l'insert invitations accepte null, la contrainte FK est nullable)
    if (!institutionId) {
      console.error('[POST /api/invite] aucune institution trouvée — proceeding avec institution_id: null')
    }

    let token: string
    try {
      const result = await createInvitation({
        email,
        full_name: fullName,
        institution_id: institutionId,
        created_by: user.id,
        role_invited: role,
      })
      token = result.token
    } catch (invErr: unknown) {
      console.error('[POST /api/invite] createInvitation failed', invErr)
      const msg = invErr instanceof Error ? invErr.message : String(invErr)
      return NextResponse.json({ error: `Échec création invitation : ${msg}` }, { status: 500 })
    }

    const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signup?token=${token}`

    const isAgentLike = role === 'agent' || role === 'admin'
    const subject = isAgentLike
      ? 'Invitation SomnoConnect - Accès technicien SOMNOVENTIS'
      : 'Invitation SomnoConnect - Portail patient SOMNOVENTIS'

    const html = isAgentLike
      ? `<p>Bonjour${fullName ? ` ${fullName}` : ''},</p>
         <p>Vous avez été invité à rejoindre SomnoConnect en tant que technicien SOMNOVENTIS.</p>
         <p><a href="${signupUrl}">Activer mon compte</a></p>
         <p>Ce lien est personnel et sécurisé.</p>`
      : `<p>Bonjour${fullName ? ` ${fullName}` : ''},</p>
         <p>Vous avez été invité à accéder au portail SOMNOVENTIS pour vos études du sommeil.</p>
         <p><a href="${signupUrl}">Activer mon compte</a></p>
         <p>Ce lien est personnel et sécurisé.</p>`

    if (process.env.RESEND_API_KEY) {
      const fallbackSubject = 'Invitation SomnoConnect'
      const normalizedSubject = subject?.trim() || fallbackSubject
      const normalizedHtml = html?.trim()
      const resendPayload = normalizedHtml
        ? {
            from: 'SomnoConnect <noreply@somnoventis.com>',
            to: email,
            subject: normalizedSubject,
            html: normalizedHtml,
          }
        : {
            from: 'SomnoConnect <noreply@somnoventis.com>',
            to: email,
            subject: normalizedSubject,
            text: `Vous avez reçu une invitation SomnoConnect. Lien: ${signupUrl}`,
          }

      const { error: emailError } = await resend.emails.send({
        ...resendPayload,
      })

      if (emailError) {
        console.error('Resend Error:', emailError)
        const resendMessage = emailError.message || 'Erreur envoi email Resend'
        return NextResponse.json({ error: resendMessage }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, token })
  } catch (error: unknown) {
    console.error('[POST /api/invite] unhandled error', error)
    console.error('[invite] DB Error:', error)
    return NextResponse.json({ error: 'Une erreur est survenue lors de la création de l\'invitation' }, { status: 500 })
  }
}
