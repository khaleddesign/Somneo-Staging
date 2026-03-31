import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;

    const { data: study, error: studyError } = await adminClient
      .from("studies")
      .select("file_path, client_id, assigned_agent_id")
      .eq("id", id)
      .maybeSingle();

    if (studyError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // RLS-like check for client
    if (profile.role === "client" && study.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!study.file_path) {
      return NextResponse.json(
        { error: "File archived or not available" },
        { status: 404 },
      );
    }

    const storagePath = study.file_path.startsWith("study-files/")
      ? study.file_path.slice("study-files/".length)
      : study.file_path;

    const { data: signed, error: signedError } = await adminClient.storage
      .from("study-files")
      .createSignedUrl(storagePath, 15 * 60);

    if (signedError || !signed?.signedUrl) {
      if (signedError?.message?.toLowerCase().includes('not found')) {
        return NextResponse.json({ error: "The EDF file cannot be found in storage (it may have been deleted or the upload was incomplete)." }, { status: 404 })
      }
      return NextResponse.json({ error: signedError?.message || 'Failed to generate signed URL' }, { status: 500 })
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
          resource_type: "edf_file",
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
