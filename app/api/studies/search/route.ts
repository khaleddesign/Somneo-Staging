import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const { searchParams } = new URL(req.url);
    const patientRef = searchParams.get("patient_ref")?.trim() ?? "";
    const statusParam = searchParams.get("status") ?? "en_attente,en_cours";
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);
    const noReport = searchParams.get("no_report") === "true";

    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean);

    let query = adminClient
      .from("studies")
      .select("id, patient_reference, study_type, status, submitted_at, report_path")
      .in("status", statuses)
      .order("submitted_at", { ascending: !patientRef })
      .limit(limit);

    if (patientRef) query = query.ilike("patient_reference", `%${patientRef}%`);
    if (noReport) query = query.is("report_path", null);

    const { data, error } = await query;
    if (error) throw error;

    const studies = (data ?? []).map((s: any) => ({
      id: s.id,
      patient_reference: decrypt(s.patient_reference),
      study_type: s.study_type,
      status: s.status,
      submitted_at: s.submitted_at,
      has_report: !!s.report_path,
    }));

    return NextResponse.json({ studies });
  })
);
