import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportDownload from '@/components/custom/ReportDownload'

export default async function ClientStudyDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: study, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', id)
    .eq('client_id', user.id)
    .single()

  if (error || !study) return notFound()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <a href="/dashboard/client" className="text-blue-600 hover:underline">
        &larr; Retour au dashboard
      </a>
      <h1 className="text-2xl font-bold mt-4 mb-6">Détail de l'étude</h1>
      <div className="space-y-2 mb-8 bg-white p-4 rounded-lg border">
        <div><b>ID patient :</b> {study.patient_reference}</div>
        <div><b>Type :</b> {study.study_type}</div>
        <div><b>Priorité :</b> {study.priority}</div>
        <div><b>Statut :</b> {study.status}</div>
        <div><b>Date de soumission :</b> {new Date(study.submitted_at).toLocaleDateString('fr-FR')}</div>
        {study.notes && <div><b>Notes :</b> {study.notes}</div>}
        {study.file_size_orig && (
          <div><b>Taille du fichier :</b> {(study.file_size_orig / 1024 / 1024).toFixed(2)} Mo</div>
        )}
      </div>
      {study.report_path && study.status === 'termine' ? (
        <ReportDownload reportPath={study.report_path} />
      ) : (
        <p className="text-sm text-gray-500">En attente de traitement par un agent.</p>
      )}
    </div>
  )
}
