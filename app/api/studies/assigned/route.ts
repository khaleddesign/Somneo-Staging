import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";

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

    // Verify role is agent or admin
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Agent can only see their own assigned studies.
    // Admin COULD see all, but AgentReportsPage historically was filtered by user.id
    // If admin is viewing their own "AgentReportsPage", they see what's assigned to them.
    const { data, error } = await admin
      .from("studies")
      .select(
        "id, patient_reference, study_type, updated_at, profiles!studies_client_id_fkey(full_name)",
      )
      .eq("assigned_agent_id", user.id)
      .not("report_path", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const studies = (data ?? []).map((row: any) => ({
      id: row.id,
      patient_reference: decrypt(row.patient_reference),
      study_type: row.study_type,
      client_name: Array.isArray(row.profiles)
        ? row.profiles[0]?.full_name ?? null
        : row.profiles?.full_name ?? null,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({ studies });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
