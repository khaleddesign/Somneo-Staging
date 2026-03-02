import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const admin = createAdminClient()

    const { data: agents, error: agentsError } = await admin
      .from('profiles')
      .select('id, full_name, email, role, is_suspended, created_at')
      .in('role', ['agent', 'admin'])
      .order('created_at', { ascending: false })

    if (agentsError) {
      return NextResponse.json({ error: agentsError.message }, { status: 500 })
    }

    const agentIds = (agents || []).map((agent) => agent.id)

    const { data: studies, error: studiesError } = agentIds.length
      ? await admin
          .from('studies')
          .select('assigned_agent_id, status, submitted_at, completed_at, updated_at')
          .in('assigned_agent_id', agentIds)
      : { data: [], error: null }

    if (studiesError) {
      return NextResponse.json({ error: studiesError.message }, { status: 500 })
    }

    const mapped = (agents || []).map((agent) => {
      const mine = (studies || []).filter((study) => study.assigned_agent_id === agent.id)
      const enCours = mine.filter((study) => study.status === 'en_cours').length
      const termine = mine.filter((study) => study.status === 'termine').length

      const completedWithDates = mine.filter(
        (study) => study.status === 'termine' && study.submitted_at && study.completed_at,
      )

      const avgTurnaround = completedWithDates.length
        ? completedWithDates.reduce((sum, study) => {
            const submitted = new Date(study.submitted_at as string).getTime()
            const completed = new Date(study.completed_at as string).getTime()
            return sum + (completed - submitted) / (1000 * 60 * 60)
          }, 0) / completedWithDates.length
        : 0

      const lastActivityIso = mine
        .map((study) => study.updated_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0] || null

      return {
        ...agent,
        en_cours: enCours,
        termine,
        avg_turnaround: Math.round(avgTurnaround * 10) / 10,
        last_activity: lastActivityIso,
      }
    })

    return NextResponse.json({ agents: mapped })
  } catch (err: unknown) {
    console.error('[GET /api/agents]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const body = await req.json()
    const { id, full_name, email, is_suspended } = body as {
      id?: string
      full_name?: string
      email?: string
      is_suspended?: boolean
    }

    if (!id) {
      return NextResponse.json({ error: 'ID agent requis' }, { status: 400 })
    }

    if (id === auth.user?.id) {
      return NextResponse.json({ error: 'Suppression de votre propre compte impossible' }, { status: 400 })
    }

    const admin = createAdminClient()
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof full_name === 'string') updatePayload.full_name = full_name
    if (typeof email === 'string') updatePayload.email = email.trim().toLowerCase()
    if (typeof is_suspended === 'boolean') updatePayload.is_suspended = is_suspended

    const { error: profileError } = await admin
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .in('role', ['agent', 'admin'])

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (typeof email === 'string') {
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, {
        email: email.trim().toLowerCase(),
      })
      if (authUpdateError) {
        console.error('[PATCH /api/agents] auth update error', authUpdateError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[PATCH /api/agents]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID agent requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { count: inProgressCount, error: countError } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_agent_id', id)
      .eq('status', 'en_cours')

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if ((inProgressCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Suppression impossible : des études en cours sont encore assignées' },
        { status: 409 },
      )
    }

    const { error: unassignError } = await admin
      .from('studies')
      .update({ assigned_agent_id: null, updated_at: new Date().toISOString() })
      .eq('assigned_agent_id', id)

    if (unassignError) {
      return NextResponse.json({ error: unassignError.message }, { status: 500 })
    }

    const { error: suspendError } = await admin
      .from('profiles')
      .update({ is_suspended: true, is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .in('role', ['agent', 'admin'])

    if (suspendError) {
      return NextResponse.json({ error: suspendError.message }, { status: 500 })
    }

    const { error: userDeleteError } = await admin.auth.admin.deleteUser(id)

    if (userDeleteError) {
      console.error('[DELETE /api/agents] auth delete error', userDeleteError)
      return NextResponse.json(
        { error: 'Agent désactivé, suppression Auth impossible (voir logs)' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('[DELETE /api/agents]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
