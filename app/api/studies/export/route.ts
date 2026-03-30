import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { computeDelayDays, isStale } from "@/lib/studies/studyMetrics";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const searchParams = new URL(req.url).searchParams;
    const period = searchParams.get("period"); // 'month', 'year', 'all', 'custom'
    const customMonth = searchParams.get("customMonth"); // 'YYYY-MM'

    const admin = createAdminClient();
    let query = admin
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, email)")
      .order("submitted_at", { ascending: false });

    // Apply exact period filtering in the database
    const now = new Date();
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query = query.gte("submitted_at", start.toISOString()).lte("submitted_at", end.toISOString());
    } else if (period === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      query = query.gte("submitted_at", start.toISOString()).lte("submitted_at", end.toISOString());
    } else if (period === "custom" && customMonth) {
      const [year, month] = customMonth.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      query = query.gte("submitted_at", start.toISOString()).lte("submitted_at", end.toISOString());
    }

    const { data: rawStudies, error } = await query;
    if (error) throw error;

    let processedStudies = (rawStudies ?? []) as Record<string, unknown>[];

    // Agents/Admins need computed SLA/stale fields
    if (profile.role !== "client" && processedStudies.length > 0) {
      const studyIds = processedStudies.map((s) => s.id as string);
      const { data: reports } = await admin
        .from("study_reports")
        .select("study_id, created_at")
        .in("study_id", studyIds)
        .order("created_at", { ascending: false });

      const reportMap = new Map<string, string>();
      for (const r of reports ?? []) {
        if (!reportMap.has(r.study_id as string)) {
          reportMap.set(r.study_id as string, r.created_at as string);
        }
      }

      processedStudies = processedStudies.map((s) => {
        const resultDate = reportMap.get(s.id as string) ?? null;
        return {
          ...s,
          result_date: resultDate,
          delay_days: computeDelayDays(s.submitted_at as string, resultDate),
          is_stale: isStale((s.updated_at ?? s.submitted_at) as string, s.status as string),
        };
      });
    }

    const studies = await Promise.all(
      processedStudies.map(async (study) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientProfile = study.profiles as any;
        return {
          ...study,
          patient_reference: study.patient_reference
            ? decrypt(study.patient_reference as string)
            : null,
          client_name: clientProfile?.full_name ?? null,
        };
      })
    );

    return NextResponse.json({ studies });
  } catch (err) {
    console.error("[GET /api/studies/export]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
