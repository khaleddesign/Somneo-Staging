import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est agent ou admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['agent', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Total studies
    const { count: total_studies } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })

    // En attente
    const { count: en_attente } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'en_attente')

    const { count: en_attente_non_assignees } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'en_attente')
      .is('assigned_agent_id', null)

    // En cours
    const { count: en_cours } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'en_cours')

    // Terminées
    const { count: termine } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'termine')

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: termine_ce_mois } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'termine')
      .gte('completed_at', startOfMonth.toISOString())

    // This week
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const { count: this_week } = await admin
      .from('studies')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', oneWeekAgo.toISOString())

    // Average turnaround time
    const { data: completedStudies } = await admin
      .from('studies')
      .select('submitted_at, completed_at')
      .eq('status', 'termine')
      .not('completed_at', 'is', null)

    let avg_turnaround = 0
    if (completedStudies && completedStudies.length > 0) {
      const turnaroundTimes = completedStudies.map((s) => {
        if (!s.submitted_at || !s.completed_at) return 0
        const submitted = new Date(s.submitted_at).getTime()
        const completed = new Date(s.completed_at).getTime()
        return (completed - submitted) / (1000 * 60 * 60) // convert to hours
      })
      avg_turnaround = turnaroundTimes.reduce((a, b) => a + b, 0) / turnaroundTimes.length
    }

    // Total active clients
    const { count: total_clients } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client')
      .eq('is_suspended', false)

    const { count: total_agents } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('role', ['agent', 'admin'])
      .eq('is_suspended', false)

    return NextResponse.json({
      total_studies: total_studies || 0,
      en_attente: en_attente || 0,
      en_attente_non_assignees: en_attente_non_assignees || 0,
      en_cours: en_cours || 0,
      termine: termine || 0,
      termine_ce_mois: termine_ce_mois || 0,
      this_week: this_week || 0,
      avg_turnaround: Math.round(avg_turnaround * 10) / 10, // round to 1 decimal
      total_clients: total_clients || 0,
      total_agents: total_agents || 0,
    })
  } catch (err: unknown) {
    console.error('[GET /api/stats]', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message || 'Erreur serveur' }, { status: 500 })
  }
}
