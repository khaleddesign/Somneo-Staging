import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const POST = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: studies, error: fetchErr } = await adminClient
      .from("studies")
      .select("id, file_path")
      .eq("status", "termine")
      .lt("completed_at", thirtyDaysAgo.toISOString())
      .not("file_path", "is", null)
      .is("archived_at", null);

    if (fetchErr) throw fetchErr;

    const errors: string[] = [];
    let archived = 0;

    for (const study of studies || []) {
      try {
        if (study.file_path) {
          const parts = study.file_path.split("/");
          const bucket = parts[0] || "study-files";
          const filePath = parts.slice(1).join("/");
          if (filePath) {
            await adminClient.storage.from(bucket).remove([filePath]);
          }
        }
        const { error: updateErr } = await adminClient
          .from("studies")
          .update({ file_path: null, archived_at: new Date().toISOString() })
          .eq("id", study.id);
        
        if (updateErr) errors.push(`Error archivage study ${study.id}: ${updateErr.message}`);
        else archived++;
      } catch (e: any) {
        errors.push(`Error study ${study.id}: ${e.message}`);
      }
    }

    return NextResponse.json({
      archived,
      errors,
      message: `${archived} file${archived !== 1 ? "s" : ""} archived`,
    });
  })
);
