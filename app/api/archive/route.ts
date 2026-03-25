import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is agent or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Retrieve studies eligible for archiving
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: studies, error: fetchErr } = await admin
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
        // Extraire le bucket et chemin du file_path
        if (study.file_path) {
          const parts = study.file_path.split("/");
          const bucket = parts[0] || "study-files";
          const filePath = parts.slice(1).join("/");

          if (filePath) {
            // Supprimer le fichier du bucket
            const { error: deleteErr } = await admin.storage
              .from(bucket)
              .remove([filePath]);

            if (deleteErr) {
              console.warn(`Error suppression fichier ${study.id}:`, deleteErr);
              // Continue even if delete fails, mark as archived
            }
          }
        }

        // Mark as archived
        const { error: updateErr } = await admin
          .from("studies")
          .update({
            file_path: null,
            archived_at: new Date().toISOString(),
          })
          .eq("id", study.id);

        if (updateErr) {
          errors.push(
            `Error archivage study ${study.id}: ${updateErr.message}`,
          );
        } else {
          archived++;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Error study ${study.id}: ${msg}`);
      }
    }

    return NextResponse.json({
      archived,
      errors,
      message: `${archived} file${archived !== 1 ? "s" : ""} archived`,
    });
  } catch (err: unknown) {
    console.error("[POST /api/archive]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 },
    );
  }
}
