import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const { data, error } = await adminClient
      .from("study_reports")
      .select("*, studies(patient_reference, study_type)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reports: data });
  })
);
