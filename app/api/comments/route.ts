import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { commentSchema } from '@/lib/validation'
import { sendEmail } from '@/lib/mail'
import { limiters } from '@/lib/rateLimit'

async function checkStudyAccess(
  userId: string,
  studyId: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>
): Promise<{ role: string } | null> {
  const [{ data: profile }, { data: study }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    admin.from('studies').select('client_id, assigned_agent_id').eq('id', studyId).maybeSingle(),
  ])

  if (!study) return null

  const role = profile?.role
  const hasAccess =
    role === 'admin' ||
    (role === 'agent' && study.assigned_agent_id === userId) ||
    (role === 'client' && study.client_id === userId)

  return hasAccess && role ? { role } : null
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const study_id = url.searchParams.get('study_id')
    if (!study_id) {
      return NextResponse.json({ error: 'study_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const access = await checkStudyAccess(user.id, study_id, supabase, admin)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json()
    const parsed = commentSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid data' },
        { status: 400 },
      )
    }
    const { study_id, message } = parsed.data

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rl = await limiters.comment.check(`comment:${user.id}`)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Try again in a minute.' },
        { status: 429, headers: rl.headers }
      )
    }

    const admin = createAdminClient()

    // Verify access before insert (same check as GET — admin client bypasses RLS)
    const access = await checkStudyAccess(user.id, study_id, supabase, admin)
    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

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
            title: 'New client message',
            message: `You received a message for study ${study_id}`,
          })
        }
      } else if (comment.profiles.role === 'agent' || comment.profiles.role === 'admin') {
        if (studyData?.client_id) {
          await admin.from('notifications').insert({
            user_id: studyData.client_id,
            title: 'New reply',
            message: 'An agent replied to your study.',
          })
        }
      }
    } catch (e) {
      console.error('in-app comment notification error', e)
    }

    // email notification
    try {
      let recipientEmail: string | null = null
      let subject = ''
      let textMessage = ''

      if (comment.profiles.role === 'client') {
        recipientEmail = 'contact@somnoventis.com'
        subject = 'New client message on SomnoConnect'
        textMessage = `<p>A client posted a new comment for study ${study_id}.</p>`
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

        subject = 'New agent message on SomnoConnect'
        textMessage = `<p>An agent posted a new comment for your study.</p>`
      }

      if (recipientEmail) {
        await sendEmail({
          to: recipientEmail,
          subject,
          html: textMessage,
        })
      }
    } catch (e) {
      console.error('comment email notification error', e)
    }

    return NextResponse.json({ comment })
  } catch (err: unknown) {
    console.error('[POST /api/comments]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
  }
}
