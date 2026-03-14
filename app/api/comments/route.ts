import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { commentSchema } from '@/lib/validation'
import { sendEmail } from '@/lib/mail'
import { limiters } from '@/lib/rateLimit'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const study_id = url.searchParams.get('study_id')
    if (!study_id) {
      return NextResponse.json({ error: 'study_id requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Verify caller has access to this study (defense-in-depth over RLS)
    const admin = createAdminClient()
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const { data: study } = await admin.from('studies').select('client_id, assigned_agent_id').eq('id', study_id).maybeSingle()

    if (!study) {
      return NextResponse.json({ error: 'Étude introuvable' }, { status: 404 })
    }

    const role = profile?.role
    const hasAccess =
      role === 'admin' ||
      (role === 'agent' && study.assigned_agent_id === user.id) ||
      (role === 'client' && study.client_id === user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // fetch comments with profile info
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(full_name, role)')
      .eq('study_id', study_id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ comments: data })
  } catch (err: unknown) {
    console.error('[GET /api/comments]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = commentSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Données invalides' },
        { status: 400 },
      )
    }
    const { study_id, message } = parsed.data

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const rl = await limiters.comment.check(`comment:${user.id}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de messages. Réessayez dans une minute.' },
        { status: 429, headers: rl.headers }
      )
    }

    const admin = createAdminClient()
    const { data: comment, error: insertErr } = await admin
      .from('comments')
      .insert({ study_id, message, user_id: user.id })
      .select('*, profiles!comments_user_id_fkey(full_name, role, email)')
      .single()

    if (insertErr) throw insertErr

    // in-app notification
    try {
      const { data: studyData, error: studyErr } = await admin
        .from('studies')
        .select('client_id, assigned_agent_id')
        .eq('id', study_id)
        .single()

      if (studyErr) throw studyErr

      if (comment.profiles.role === 'client') {
        if (studyData?.assigned_agent_id) {
          await admin.from('notifications').insert({
            user_id: studyData.assigned_agent_id,
            title: 'Nouveau message client',
            message: `Vous avez reçu un message pour l'étude ${study_id}`,
          })
        }
      } else if (comment.profiles.role === 'agent' || comment.profiles.role === 'admin') {
        if (studyData?.client_id) {
          await admin.from('notifications').insert({
            user_id: studyData.client_id,
            title: 'Nouvelle réponse',
            message: 'Un agent a répondu à votre étude.',
          })
        }
      }
    } catch (e) {
      console.error('erreur notification in-app commentaire', e)
    }

    // email notification
    try {
      let recipientEmail: string | null = null
      let subject = ''
      let textMessage = ''

      if (comment.profiles.role === 'client') {
        recipientEmail = 'contact@somnoventis.com'
        subject = 'Nouveau message client sur SomnoConnect'
        textMessage = `<p>Un client a posté un nouveau commentaire pour l'étude ${study_id}.</p>`
      } else {
        // agent or admin
        // lookup client email from study
        const { data: studyData, error: studyErr } = await admin
          .from('studies')
          .select('client_id')
          .eq('id', study_id)
          .single()
        if (studyErr) throw studyErr

        if (studyData?.client_id) {
          const { data: clientProf, error: clientErr } = await admin
            .from('profiles')
            .select('email')
            .eq('id', studyData.client_id)
            .single()
          if (clientErr) throw clientErr
          recipientEmail = clientProf?.email || null
        }

        subject = 'Nouveau message agent sur SomnoConnect'
        textMessage = `<p>Un agent a posté un nouveau commentaire pour votre étude.</p>`
      }

      if (recipientEmail) {
        await sendEmail({
          to: recipientEmail,
          subject,
          html: textMessage,
        })
      }
    } catch (e) {
      console.error('erreur envoi mail commentaire', e)
    }

    return NextResponse.json({ comment })
  } catch (err: unknown) {
    console.error('[POST /api/comments]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}
