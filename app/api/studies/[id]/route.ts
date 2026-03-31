import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;
    const { data: study, error } = await adminClient.from("studies").select("*").eq("id", id).maybeSingle();
    if (error || !study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

    // RLS-like check for client
    if (profile.role === "client" && study.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ study });
  })
);

export const DELETE = withErrorHandler(
  requireAuth(["client", "admin"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;
    const { data: study, error: fetchError } = await adminClient.from("studies").select("id, client_id, file_path, report_path, status").eq("id", id).single();
    if (fetchError || !study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

    const isAdmin = profile.role === "admin";
    if (study.client_id !== user.id && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (["en_cours", "termine"].includes(study.status) && !isAdmin) return NextResponse.json({ error: "Cannot delete active study" }, { status: 403 });

    if (study.file_path) await adminClient.storage.from("study-files").remove([study.file_path]);
    if (study.report_path) await adminClient.storage.from("reports-files").remove([study.report_path]);

    const { error: deleteError } = await adminClient.from("studies").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  })
);
