import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StudyActions from '@/components/custom/StudyActions'
import StudyComments from '@/components/custom/StudyComments'
import AppLayout from '@/components/custom/AppLayout'
import AssignStudyButton from '@/components/custom/AssignStudyButton'
import ReportEditor from '@/components/custom/ReportEditor'
import StudyFileDownloadCard from '@/components/custom/StudyFileDownloadCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function getStatusBadge(status: string) {
  if (status === 'en_attente') return 'bg-teal/10 text-midnight border border-teal/30'
  if (status === 'en_cours') return 'bg-midnight text-sand border border-midnight/70'
  if (status === 'termine') return 'bg-gold/15 text-midnight border border-gold/40'
  return 'bg-gray-50 text-gray-700 border border-gray-200'
}

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

  const isAdmin = profile.role === 'admin'

  // Debug — visible dans les logs serveur Next.js
  console.log('[AgentStudyDetail] study.status         :', study.status)
  console.log('[AgentStudyDetail] study.assigned_agent_id:', study.assigned_agent_id)
  console.log('[AgentStudyDetail] user.id               :', user.id)
  console.log('[AgentStudyDetail] profile.role          :', profile.role)

  // Onglet visible si statut actif ET (agent assigné OU admin)
  const canWriteReport =
    ['en_cours', 'en_attente'].includes(study.status) &&
    (study.assigned_agent_id === user.id || isAdmin)

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <a href="/dashboard/agent" className="text-teal hover:underline font-body text-sm">
          &larr; Retour au dashboard
        </a>

        <div>
          <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">Dossier Patient</h1>
          <p className="text-gray-500 font-body mt-1">Suivi clinique de l&apos;étude du sommeil</p>
        </div>

        <Tabs defaultValue="informations">
          <TabsList>
            <TabsTrigger value="informations">Informations</TabsTrigger>
            {canWriteReport && <TabsTrigger value="rapport">Rédiger le rapport</TabsTrigger>}
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
          </TabsList>

          <TabsContent value="informations" className="space-y-6">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl text-midnight font-heading">Informations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">ID patient</p>
                  <p className="text-midnight font-body mt-1">{study.patient_reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Client</p>
                  <p className="text-midnight font-body mt-1">{study.profiles?.full_name} ({study.profiles?.email})</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Type</p>
                  <p className="text-midnight font-body mt-1">{study.study_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Priorité</p>
                  <p className="text-midnight font-body mt-1">{study.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Statut</p>
                  <span className={`inline-flex mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(study.status)}`}>
                    {study.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Date de soumission</p>
                  <p className="text-midnight font-body mt-1">{new Date(study.submitted_at).toLocaleDateString('fr-FR')}</p>
                </div>
                {study.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">Notes</p>
                    <p className="text-midnight font-body mt-1">{study.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <StudyFileDownloadCard
              studyId={study.id}
              filePath={study.file_path}
              fileSizeBytes={study.file_size_orig}
            />

            {study.assigned_agent_id === null && (
              <Card className="shadow-sm border-teal/30 bg-teal/5">
                <CardHeader>
                  <CardTitle className="text-xl text-midnight font-heading">Assignation</CardTitle>
                </CardHeader>
                <CardContent>
                  <AssignStudyButton studyId={study.id} />
                </CardContent>
              </Card>
            )}

            {study.assigned_agent_id === user.id && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl text-midnight font-heading">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <StudyActions studyId={study.id} currentStatus={study.status} reportPath={study.report_path} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rapport">
            {canWriteReport ? (
              <ReportEditor
                studyId={study.id}
                studyType={study.study_type}
                patientReference={study.patient_reference}
                agentName={profile.full_name || 'Agent'}
              />
            ) : (
              <Card className="shadow-sm border-gray-200">
                <CardContent className="p-6 text-sm text-gray-600">
                  Étude non assignée ou déjà terminée
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="discussion">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-midnight font-heading">Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <StudyComments
                  studyId={study.id}
                  currentUser={{ id: user.id, name: profile?.full_name || null }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
