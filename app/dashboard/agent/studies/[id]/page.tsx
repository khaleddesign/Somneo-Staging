import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudyActions from '@/components/custom/StudyActions'
import StudyComments from '@/components/custom/StudyComments'
import AppLayout from '@/components/custom/AppLayout'

export default async function AgentStudyDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['agent', 'admin'].includes(profile.role)) return notFound()

  const { data: study, error } = await supabase
    .from('studies')
    .select('*, profiles!studies_client_id_fkey(full_name, email)')
    .eq('id', id)
    .single()

  if (error || !study) return notFound()

  return (
    <AppLayout>
      <div className="p-8 max-w-2xl mx-auto">
      <a href="/dashboard/agent" className="text-blue-600 hover:underline">
        &larr; Retour au dashboard
      </a>
      <h1 className="text-2xl font-bold mt-4 mb-6">Détail de l'étude</h1>
      <div className="space-y-2 mb-8 bg-white p-4 rounded-lg border">
        <div><b>ID patient :</b> {study.patient_reference}</div>
        <div><b>Type :</b> {study.study_type}</div>
        <div><b>Priorité :</b> {study.priority}</div>
        <div><b>Statut :</b> {study.status}</div>
        <div><b>Date de soumission :</b> {new Date(study.submitted_at).toLocaleDateString('fr-FR')}</div>
        <div><b>Client :</b> {study.profiles?.full_name} ({study.profiles?.email})</div>
        {study.notes && <div><b>Notes :</b> {study.notes}</div>}
      </div>
      <StudyActions studyId={study.id} currentStatus={study.status} reportPath={study.report_path} />
      <div className="mt-8">
        <StudyComments
          studyId={study.id}
          currentUser={{ id: user.id, name: profile?.full_name || null }}
        />
      </div>
      </div>
    </AppLayout>
  )
}
