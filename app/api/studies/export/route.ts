import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { computeDelayDays, isStale } from "@/lib/studies/studyMetrics";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { profile, adminClient }) => {
    const searchParams = new URL(req.url).searchParams;
    const period = searchParams.get("period");
    const customMonth = searchParams.get("customMonth");

    let query = adminClient
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, email)")
      .order("submitted_at", { ascending: false });

    const now = new Date();
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      query = query.gte("submitted_at", start).lte("submitted_at", end);
    } else if (period === "year") {
      const start = new Date(now.getFullYear(), 0, 1).toISOString();
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      query = query.gte("submitted_at", start).lte("submitted_at", end);
    } else if (period === "custom" && customMonth) {
      const [year, month] = customMonth.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
      query = query.gte("submitted_at", start).lte("submitted_at", end);
    }

    const { data: rawStudies, error } = await query;
    if (error) throw error;

    let processedStudies = (rawStudies ?? []) as any[];
    if (profile.role !== "client" && processedStudies.length > 0) {
      const studyIds = processedStudies.map((s) => s.id);
      const { data: reports } = await adminClient.from("study_reports").select("study_id, created_at").in("study_id", studyIds).order("created_at", { ascending: false });
      const reportMap = new Map(reports?.map((r: any) => [r.study_id, r.created_at]));

      processedStudies = processedStudies.map((s) => {
        const resultDate = reportMap.get(s.id) ?? null;
        return {
          ...s,
          result_date: resultDate,
          delay_days: computeDelayDays(s.submitted_at, resultDate),
          is_stale: isStale(s.updated_at ?? s.submitted_at, s.status),
        };
      });
    }

    const studies = await Promise.all(processedStudies.map(async (s) => ({
      ...s,
      patient_reference: s.patient_reference ? decrypt(s.patient_reference) : null,
      client_name: s.profiles?.full_name ?? null,
    })));

    return NextResponse.json({ studies });
  })
);
