import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { sendEmail } from "@/lib/mail";
import { z } from "zod";

const assignReportSchema = z.object({
  study_id: z.string().min(1, "study_id requis"),
});

const handler = requireAuth(
  ["agent", "admin"],
  { schema: assignReportSchema },
  async (req, { adminClient, params, validatedData }) => {
    const { id } = await params;
    const { study_id: studyId } = validatedData!;

    // Load the unassigned report
    const { data: report } = await adminClient
      .from("unassigned_reports")
      .select("id, agent_id, storage_path, original_filename")
      .eq("id", id)
      .maybeSingle();

    if (!report) {
      return NextResponse.json(
        { error: "Rapport non trouvé" },
        { status: 404 },
      );
    }

    // Load study
    const { data: study } = await adminClient
      .from("studies")
      .select("id, patient_reference, client_id, assigned_agent_id")
      .eq("id", studyId)
      .maybeSingle();

    if (!study) {
      return NextResponse.json({ error: "Étude non trouvée" }, { status: 404 });
    }

    // 1. Download the PDF from unassigned storage path
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from("reports-files")
      .download(report.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Impossible de lire le fichier PDF" },
        { status: 500 },
      );
    }

    // 2. Upload to the study's canonical path (upsert to allow overwrite)
    const targetPath = `${studyId}/report.pdf`;
    const { error: uploadError } = await adminClient.storage
      .from("reports-files")
      .upload(targetPath, fileData, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 3. Update study with report path + status
    const reportPath = `reports-files/${studyId}/report.pdf`;
    const { error: studyUpdateError } = await adminClient
      .from("studies")
      .update({
        report_path: reportPath,
        status: "termine",
        updated_at: new Date().toISOString(),
      })
      .eq("id", studyId);

    if (studyUpdateError) {
      return NextResponse.json(
        { error: studyUpdateError.message },
        { status: 500 },
      );
    }

    // 4. Send email to client (fire-and-forget)
    adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", study.client_id)
      .maybeSingle()
      .then(({ data: clientProfile }) => {
        if (!clientProfile?.email) return;

        const maskPatientReference = (ref: string): string => {
          if (!ref || ref.length < 4) return "****";
          return "***" + ref.slice(-4);
        };

        let maskedRef = "****";
        try {
          const decryptedRef = decrypt(study.patient_reference);
          maskedRef = maskPatientReference(decryptedRef);
        } catch (e) {
          console.error("Failed to decrypt patient reference for email", e);
        }

        sendEmail({
          to: clientProfile.email,
          subject: "SomnoConnect — Votre rapport d'analyse est disponible",
          html: `
            <p>Bonjour${clientProfile.full_name ? ` ${clientProfile.full_name}` : ""},</p>
            <p>Le rapport d'analyse de votre étude (<strong>${maskedRef}</strong>)
            est maintenant disponible dans votre espace client SomnoConnect.</p>
            <p>Merci de votre confiance.</p>
            <p>— L'équipe SOMNOVENTIS</p>
          `,
        }).catch(() => {});
      });

    // 5. Delete the unassigned record + original storage file (best-effort)
    await adminClient.from("unassigned_reports").delete().eq("id", id);
    adminClient.storage
      .from("reports-files")
      .remove([report.storage_path])
      .catch(() => {});

    return NextResponse.json({
      success: true,
      study_id: studyId,
      report_path: reportPath,
    });
  }
);

export const POST = withErrorHandler(handler);
export const PATCH = withErrorHandler(handler);
