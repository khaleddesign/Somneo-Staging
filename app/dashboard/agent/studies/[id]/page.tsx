import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import StudyActions from "@/components/custom/StudyActions";
import StudyComments from "@/components/custom/StudyComments";
import AppLayout from "@/components/custom/AppLayout";
import ReportEditor from "@/components/custom/ReportEditor";
import StudyFileDownloadCard from "@/components/custom/StudyFileDownloadCard";
import ClientOnly from "@/components/custom/ClientOnly";
import SectionErrorBoundary from "@/components/custom/SectionErrorBoundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getStatusBadge(status: string) {
  if (status === "en_attente")
    return "bg-teal/10 text-midnight border border-teal/30";
  if (status === "en_cours")
    return "bg-midnight text-sand border border-midnight/70";
  if (status === "termine")
    return "bg-gold/15 text-midnight border border-gold/40";
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

export default async function AgentStudyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["agent", "admin"].includes(profile.role)) return notFound();

  const { data: study, error } = await supabase
    .from("studies")
    .select("*, profiles!studies_client_id_fkey(full_name, email)")
    .eq("id", id)
    .single();

  if (error || !study) return notFound();

  // Decryption
  study.patient_reference = decrypt(study.patient_reference);

  const isAdmin = profile.role === "admin";

  // Tab visible if active status
  const canWriteReport = ["en_cours", "en_attente"].includes(study.status);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 bg-[#f0f4f8]">
        <a
          href="/dashboard/agent/studies"
          className="text-teal hover:underline font-body text-sm"
        >
          &larr; Back to studies
        </a>

        <Card className="bg-linear-to-r from-midnight to-[#0d2137] border-t-4 border-t-teal text-white rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h1 className="text-4xl lg:text-5xl font-display leading-tight text-sand">
              Patient File
            </h1>
            <p className="text-sand/70 font-body mt-1">
              Clinical sleep study monitoring
            </p>
          </CardContent>
        </Card>

        <ClientOnly fallback={<div className="h-12" />}>
          <Tabs defaultValue="informations">
            <TabsList>
              <TabsTrigger value="informations">Details</TabsTrigger>
              {canWriteReport && (
                <TabsTrigger value="report">Write report</TabsTrigger>
              )}
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="informations" className="space-y-6">
              <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl text-midnight font-heading inline-flex items-center gap-3">
                    <span className="text-3xl font-display text-teal/30">
                      01
                    </span>
                    Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Patient ID
                    </p>
                    <p className="text-midnight font-body mt-1">
                      {study.patient_reference}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Client
                    </p>
                    <p className="text-midnight font-body mt-1">
                      {study.profiles?.full_name} ({study.profiles?.email})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Type
                    </p>
                    <p className="text-midnight font-body mt-1">
                      {study.study_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Priority
                    </p>
                    <p className="text-midnight font-body mt-1">
                      {study.priority}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Status
                    </p>
                    <span
                      className={`inline-flex mt-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(study.status)}`}
                    >
                      {study.status === "en_attente"
                        ? "pending"
                        : study.status === "en_cours"
                          ? "in progress"
                          : study.status === "termine"
                            ? "completed"
                            : study.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                      Submission date
                    </p>
                    <p className="text-midnight font-body mt-1">
                      {new Date(study.submitted_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  {study.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                        Notes
                      </p>
                      <p className="text-midnight font-body mt-1">
                        {study.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <StudyFileDownloadCard
                studyId={study.id}
                filePath={study.file_path}
                fileSizeBytes={study.file_size_orig}
              />

              <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
                <CardHeader>
                  <CardTitle className="text-xl text-midnight font-heading inline-flex items-center gap-3">
                    <span className="text-3xl font-display text-teal/30">
                      02
                    </span>
                    Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionErrorBoundary sectionName="Actions">
                    <StudyActions
                      studyId={study.id}
                      currentStatus={study.status}
                      reportPath={study.report_path}
                    />
                  </SectionErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report">
              {canWriteReport ? (
                <SectionErrorBoundary sectionName="Report Editor">
                  <ReportEditor
                    studyId={study.id}
                    studyType={study.study_type}
                    patientReference={study.patient_reference}
                    agentName={profile.full_name || "Agent"}
                  />
                </SectionErrorBoundary>
              ) : (
                <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
                  <CardContent className="p-6 text-sm text-gray-600">
                    Study not assigned or already completed
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="discussion">
              <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
                <CardHeader>
                  <CardTitle className="text-xl text-midnight font-heading inline-flex items-center gap-3">
                    <span className="text-3xl font-display text-teal/30">
                      03
                    </span>
                    Discussion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SectionErrorBoundary sectionName="Discussion">
                    <StudyComments
                      studyId={study.id}
                      currentUser={{
                        id: user.id,
                        name: profile?.full_name || null,
                      }}
                    />
                  </SectionErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ClientOnly>
      </div>
    </AppLayout>
  );
}
