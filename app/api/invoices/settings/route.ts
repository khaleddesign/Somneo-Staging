import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient }) => {
    const { data, error } = await adminClient
      .from("invoice_settings")
      .select("*")
      .order("study_type", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ settings: data ?? [] });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient }) => {
    const body = await req.json();
    const updates = Array.isArray(body.prices) ? body.prices : [];
    if (updates.length === 0) return NextResponse.json({ error: "No update provided" }, { status: 400 });

    const upsertData = updates
      .filter((item: any) => item.study_type && !Number.isNaN(Number(item.price_ht)))
      .map((item: any) => ({
        study_type: item.study_type,
        price_ht: Number(item.price_ht),
        updated_at: new Date().toISOString(),
      }));

    if (upsertData.length > 0) {
      const { error } = await adminClient
        .from("invoice_settings")
        .upsert(upsertData, { onConflict: "study_type" });
      if (error) throw error;
    }

    const { data: refreshed } = await adminClient
      .from("invoice_settings")
      .select("*")
      .order("study_type", { ascending: true });

    return NextResponse.json({ settings: refreshed ?? [] });
  })
);
