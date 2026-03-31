import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;

    const { data: study, error: studyError } = await adminClient
      .from("studies")
      .select("report_path, client_id, assigned_agent_id")
      .eq("id", id)
      .maybeSingle();

    if (studyError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // RLS-like check for client
    if (profile.role === "client" && study.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!study.report_path) {
      return NextResponse.json(
        { error: "Report not available" },
        { status: 404 },
      );
    }

    const storagePath = study.report_path.startsWith("reports-files/")
      ? study.report_path.slice("reports-files/".length)
      : study.report_path;

    const { data: signed, error: signedError } = await adminClient.storage
      .from("reports-files")
      .createSignedUrl(storagePath, 15 * 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message || "Unable to generate report URL" },
        { status: 500 },
      );
    }

    // --- Trace d'Audit ---
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Audit (non-blocking)
    (async () => {
      try {
        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          action: "download_request",
          resource_type: "report_pdf",
          resource_id: id,
          ip_address: clientIp,
          user_agent: userAgent,
          metadata: { role: profile.role },
        });
      } catch (auditError) {
        console.error("[Audit Error]", auditError);
      }
    })();

    return NextResponse.json({ url: signed.signedUrl });
  })
);

export const POST = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient, params }) => {
    const { id } = await params;

    const { data: study, error: studyError } = await adminClient
      .from("studies")
      .select("id, assigned_agent_id")
      .eq("id", id)
      .maybeSingle();

    if (studyError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "PDF file required" }, { status: 400 });
    }

    const uploadPath = `${id}/report.pdf`;
    const { error: uploadError } = await adminClient.storage
      .from("reports-files")
      .upload(uploadPath, file, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const reportPath = `reports-files/${id}/report.pdf`;
    const now = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("studies")
      .update({
        report_path: reportPath,
        status: "termine",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, report_path: reportPath });
  })
);
