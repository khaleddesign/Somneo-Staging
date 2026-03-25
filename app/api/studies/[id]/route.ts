import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldAuditAccess } from "@/lib/studies/scopeFilter";
import { buildAuditEntry } from "@/lib/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get profile (role)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 3. Fetch study via RLS (RLS enforces access control)
    const { data: study, error: fetchError } = await supabase
      .from("studies")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // 4. Audit cross-client reads (client accessing another client's study)
    if (
      profile.role === "client" &&
      shouldAuditAccess(user.id, study.client_id as string)
    ) {
      const entry = buildAuditEntry(
        study.id as string,
        study.client_id as string,
      );
      // fire-and-forget — audit failure must not block response
      (async () => {
        try {
          const adminClient = createAdminClient();
          await adminClient.from("audit_logs").insert({
            user_id: user.id,
            action: entry.action,
            resource_type: entry.resource_type,
            resource_id: entry.resource_id,
            metadata: entry.metadata,
          });
        } catch {
          // intentionally swallowed
        }
      })();
    }

    return NextResponse.json({ study });
  } catch (error) {
    console.error("[GET Study]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate the user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";

    // 2. Verify permissions and retrieve study info
    const { data: study, error: fetchError } = await supabase
      .from("studies")
      .select("id, client_id, file_path, report_path, status")
      .eq("id", id)
      .single();

    if (fetchError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    // Only the owner or an admin can delete
    if (study.client_id !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized to delete this study" },
        { status: 403 },
      );
    }

    // A client cannot delete an active or completed study — only admins can
    if (["en_cours", "termine"].includes(study.status) && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an active or completed study. Contact an administrator.",
        },
        { status: 403 },
      );
    }

    // 3. Delete physical files (admin client bypasses Storage RLS)
    const adminSupabase = createAdminClient();

    // Delete source EDF file
    if (study.file_path) {
      const { error: storageError1 } = await adminSupabase.storage
        .from("study-files")
        .remove([study.file_path]);

      if (storageError1) {
        console.error("[DELETE Study] Error deleting EDF file:", storageError1);
        // Don't block SQL deletion if file is not found
      }
    }

    // Delete PDF report
    if (study.report_path) {
      const { error: storageError2 } = await adminSupabase.storage
        .from("reports-files")
        .remove([study.report_path]);

      if (storageError2) {
        console.error(
          "[DELETE Study] Error deleting PDF report:",
          storageError2,
        );
      }
    }

    // 4. Delete SQL record — automatically triggers `trg_audit_study_deletion`
    const { error: deleteError } = await supabase
      .from("studies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE Study] Error deleting SQL record:", deleteError);
      return NextResponse.json(
        { error: "Error deleting from database" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE Study] Internal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
