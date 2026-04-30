import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { r2Client, R2_BUCKET } from "@/lib/backup/r2-client";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

async function isBackedUpToR2(filePath: string): Promise<boolean> {
  try {
    await r2Client.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: `study-files/${filePath}` }),
    );
    return true;
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "Configuration missing" }, { status: 503 });
    }
    if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FILE DELETION DISABLED — waiting for R2 backup to be fully verified.
    // Re-enable once nightly backup-r2 runs are confirmed stable.
    return NextResponse.json({
      disabled: true,
      reason: "Pending R2 backup verification",
    });

    const admin = createAdminClient();

    const deadline = new Date();
    deadline.setHours(deadline.getHours() - 72);

    const { data: expiredStudies, error: fetchError } = await admin
      .from("studies")
      .select("id, file_path")
      .eq("status", "termine")
      .not("file_path", "is", null)
      .lt("updated_at", deadline.toISOString());

    if (fetchError) {
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!expiredStudies || expiredStudies.length === 0) {
      return NextResponse.json({ success: true, cleanedFiles: 0, skippedNotInR2: 0 });
    }

    let deletedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const study of expiredStudies) {
      if (!study.file_path) continue;

      try {
        const backedUp = await isBackedUpToR2(study.file_path);
        if (!backedUp) {
          skippedCount++;
          continue;
        }

        const { error: storageError } = await admin.storage
          .from("study-files")
          .remove([study.file_path]);

        if (storageError) {
          failedCount++;
          continue;
        }

        const { error: updateError } = await admin
          .from("studies")
          .update({ file_path: null })
          .eq("id", study.id);

        if (updateError) {
          failedCount++;
          continue;
        }

        deletedCount++;
      } catch (err) {
        console.error(`[CRON CLEANUP] Error for study ${study.id}:`, err);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      cleanedFiles: deletedCount,
      failedFiles: failedCount,
      skippedNotInR2: skippedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON CLEANUP] Fatal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
