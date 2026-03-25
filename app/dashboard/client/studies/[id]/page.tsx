import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import ReportDownload from "@/components/custom/ReportDownload";
import StudyComments from "@/components/custom/StudyComments";
import SectionErrorBoundary from "@/components/custom/SectionErrorBoundary";
import AppLayout from "@/components/custom/AppLayout";
import DeleteStudyButton from "@/components/custom/DeleteStudyButton";
import StudyFileDownloadCard from "@/components/custom/StudyFileDownloadCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function getStatusBadge(status: string) {
  if (status === "en_attente")
    return "bg-teal/10 text-midnight border border-teal/30";
  if (status === "en_cours")
    return "bg-midnight text-sand border border-midnight/70";
  if (status === "termine")
    return "bg-gold/15 text-midnight border border-gold/40";
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

export default async function ClientStudyDetail({
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

  // fetch client profile to get full name for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const { data: study, error } = await admin
    .from("studies")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !study) return notFound();

  // Decryption
  study.patient_reference = decrypt(study.patient_reference);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 bg-[#f0f4f8]">
        <a
          href="/dashboard/client/studies"
          className="text-teal hover:underline font-body text-sm"
        >
          &larr; Back to studies
        </a>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl lg:text-5xl text-midnight font-display leading-tight">
              Patient File
            </h1>
            <p className="text-gray-500 font-body mt-1">
              Your sleep study tracking
            </p>
          </div>
          <div className="self-end sm:self-auto">
            <DeleteStudyButton
              studyId={study.id}
              redirectUrl="/dashboard/client/studies"
            />
          </div>
        </div>

        <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-midnight font-heading">
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
                Type
              </p>
              <p className="text-midnight font-body mt-1">{study.study_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                Priority
              </p>
              <p className="text-midnight font-body mt-1">{study.priority}</p>
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
            {study.file_size_orig && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                  File size
                </p>
                <p className="text-midnight font-body mt-1">
                  {(study.file_size_orig / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            {study.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-heading">
                  Notes
                </p>
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

        <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">
              Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {study.report_path && study.status === "termine" ? (
              <ReportDownload
                studyId={study.id}
                reportPath={study.report_path}
              />
            ) : (
              <p className="text-sm text-gray-500 font-body">
                Awaiting processing by an agent.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100 rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-midnight font-heading">
              Discussion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SectionErrorBoundary sectionName="Discussion">
              <StudyComments
                studyId={study.id}
                currentUser={{ id: user.id, name: profile?.full_name || null }}
              />
            </SectionErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
