import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const POST = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { user, adminClient }) => {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file || file.type !== "application/pdf") return NextResponse.json({ error: "Fichier PDF requis" }, { status: 400 });

    const reportId = crypto.randomUUID();
    const storagePath = `unassigned/${user.id}/${reportId}.pdf`;
    const { error: uploadError } = await adminClient.storage.from("reports-files").upload(storagePath, file, { upsert: false, contentType: "application/pdf" });
    if (uploadError) throw uploadError;

    const { data: row, error: insertError } = await adminClient
      .from("unassigned_reports")
      .insert({ id: reportId, agent_id: user.id, storage_path: storagePath, original_filename: file.name, file_size: file.size })
      .select("id, storage_path, original_filename, file_size, uploaded_at")
      .single();

    if (insertError) {
      await adminClient.storage.from("reports-files").remove([storagePath]);
      throw insertError;
    }

    return NextResponse.json({ success: true, report: row }, { status: 201 });
  })
);

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const { data, error } = await adminClient
      .from("unassigned_reports")
      .select("id, agent_id, original_filename, file_size, uploaded_at")
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reports: data ?? [] });
  })
);
