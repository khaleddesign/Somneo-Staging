import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { parsePaginationParams } from "@/lib/studies/paginationParams";
import { paginateResults } from "@/lib/studies/paginateResults";
import { computeDelayDays, isStale } from "@/lib/studies/studyMetrics";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient }) => {
    // ── Pagination params ──────────────────────────────────────────────────
    const searchParams = new URL(req.url).searchParams;
    const { limit, cursor } = parsePaginationParams(searchParams);

    // ── DB query with cursor-based pagination ──────────────────────────────
    // Fetch limit+1 to detect if there's a next page (no COUNT(*) needed)
    let query = adminClient
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, email)")
      .order("submitted_at", { ascending: false })
      .limit(limit + 1);

    if (profile.role === "client") {
      query = query.eq("client_id", user.id);
    }

    if (cursor) {
      query = query.lt("submitted_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rawStudies = (data ?? []) as any[];

    // ── Cursor pagination: detect next page ──────────────────────────────
    const { items: pageStudies, nextCursor } = paginateResults(rawStudies, limit, "submitted_at");

    // ── Enrich studies with result_date, delay_days, is_stale ─
    const pageIds = pageStudies.map((s) => s.id as string);
    let enrichedStudies = pageStudies;

    if (pageIds.length > 0) {
      const { data: reports } = await adminClient
        .from("study_reports")
        .select("study_id, created_at")
        .in("study_id", pageIds)
        .order("created_at", { ascending: false });

      const reportMap = new Map<string, string>();
      for (const r of reports ?? []) {
        if (!reportMap.has(r.study_id as string)) {
          reportMap.set(r.study_id as string, r.created_at as string);
        }
      }

      enrichedStudies = pageStudies.map((s) => {
        const resultDate = reportMap.get(s.id as string) ?? null;
        return {
          ...s,
          result_date: resultDate,
          delay_days: computeDelayDays(s.submitted_at as string, resultDate),
          is_stale: isStale(
            (s.updated_at ?? s.submitted_at) as string,
            s.status as string,
          ),
        };
      });
    }

    // ── Decrypt patient_reference in parallel ───────────────────────────
    const studies = await Promise.all(
      enrichedStudies.map(async (study) => ({
        ...study,
        patient_reference: study.patient_reference
          ? decrypt(study.patient_reference as string)
          : null,
      })),
    );

    return NextResponse.json({ studies, nextCursor });
  })
);
