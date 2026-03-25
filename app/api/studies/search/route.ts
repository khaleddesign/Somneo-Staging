import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/studies/search
 * Agent/admin only.
 *
 * Query params:
 *   patient_ref  — partial match on patient_reference (case-insensitive)
 *   status       — comma-separated list of statuses (default: en_attente,en_cours)
 *   limit        — max results (default 10, max 50)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientRef = searchParams.get("patient_ref")?.trim() ?? "";
    const statusParam = searchParams.get("status") ?? "en_attente,en_cours";
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);
    const noReport = searchParams.get("no_report") === "true";

    const statuses = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let query = admin
      .from("studies")
      .select(
        "id, patient_reference, study_type, status, submitted_at, report_path",
      )
      .in("status", statuses)
      // Without a search term we sort oldest-first (most urgent); with a term, newest-first
      .order("submitted_at", { ascending: !patientRef })
      .limit(limit);

    if (patientRef) {
      query = query.ilike("patient_reference", `%${patientRef}%`);
    }

    if (noReport) {
      query = query.is("report_path", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const studies = (data ?? []).map((s) => ({
      id: s.id,
      patient_reference: s.patient_reference,
      study_type: s.study_type,
      status: s.status,
      submitted_at: s.submitted_at,
      has_report: !!s.report_path,
    }));

    return NextResponse.json({ studies });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
