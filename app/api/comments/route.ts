import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const body = await req.json()
    const { study_id, message } = body
    if (!study_id || !message) {
      return NextResponse.json({ error: 'study_id et message requis' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: comment, error: insertErr } = await admin
      .from('comments')
      .insert({ study_id, message, user_id: user.id })
      .select('*, profiles!comments_user_id_fkey(full_name, role, email)')
      .single()

    if (insertErr) throw insertErr

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
        // fire-and-forget notification (URL absolue requise côté serveur)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        fetch(`${appUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: recipientEmail,
            subject,
            message: textMessage,
          }),
        }).catch((e) => console.error('notif err', e))
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
