import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrphanPaths } from "@/lib/cron/findOrphanFiles";

export const dynamic = "force-dynamic";

const BUCKET = "study-files";
const TTL_HOURS = 24;

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "Configuration missing" },
        { status: 503 },
      );
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // 1. List all objects in the bucket
    const { data: bucketObjects, error: listError } = await admin.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (listError) {
      return NextResponse.json(
        { error: "Storage list error" },
        { status: 500 },
      );
    }

    // 2. Get all file_path values currently referenced by studies
    const { data: studies, error: dbError } = await admin
      .from("studies")
      .select("file_path")
      .not("file_path", "is", null);

    if (dbError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const studyFilePaths = (studies ?? [])
      .map((s: { file_path: string | null }) => s.file_path)
      .filter(Boolean) as string[];

    // 3. Compute orphan paths using pure utility (testable independently)
    const objects = (bucketObjects ?? []).map((o) => ({
      name: o.name,
      created_at: o.created_at ?? new Date(0).toISOString(),
    }));

    const orphanPaths = findOrphanPaths(objects, studyFilePaths, TTL_HOURS);

    if (orphanPaths.length === 0) {
      return NextResponse.json({
        message: "No orphan files found.",
        deleted: 0,
      });
    }

    // FILE DELETION DISABLED — waiting for R2 backup confirmation.
    // Re-enable once backup-r2 Edge Function is verified working.
    return NextResponse.json({
      disabled: true,
      reason: "Pending R2 backup verification",
      would_delete: orphanPaths.length,
      paths: orphanPaths,
    });
  } catch (err) {
    console.error("[CRON cleanup-orphans] Fatal error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
