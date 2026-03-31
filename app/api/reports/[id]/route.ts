import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;
    const { data: report, error } = await adminClient.from("study_reports").select("*, studies(client_id)").eq("id", id).maybeSingle();
    if (error || !report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    if (profile.role === "client" && report.studies?.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ report });
  })
);
