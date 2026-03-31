import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "cancelled"]),
});

export const GET = withErrorHandler(
  requireAuth(["admin", "client"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;
    const { data: invoice, error } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // RLS-like check for client
    if (profile.role === "client" && invoice.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const studyIds = Array.isArray(invoice.study_ids) ? invoice.study_ids.filter(Boolean) : [];
    let studies: any[] = [];
    if (studyIds.length > 0) {
      const { data: studyData, error: studiesError } = await adminClient
        .from("studies")
        .select("id, patient_reference, study_type, status, completed_at, submitted_at")
        .in("id", studyIds);
      
      if (studiesError) throw studiesError;
      studies = (studyData ?? []).map((s: any) => ({
        ...s,
        patient_reference: decrypt(s.patient_reference),
      }));
    }

    return NextResponse.json({ invoice, studies });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["admin"], { schema: updateInvoiceSchema }, async (req, { adminClient, params, validatedData }) => {
    const { id } = await params;
    const { status } = validatedData!;

    const { data: updated, error } = await adminClient
      .from("invoices")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ invoice: updated });
  })
);

export const DELETE = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient, params }) => {
    const { id } = await params;

    // 1. Get invoice to find PDF path
    const { data: invoice } = await adminClient
      .from("invoices")
      .select("pdf_path")
      .eq("id", id)
      .maybeSingle();

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // 2. Delete PDF from storage if exists
    if (invoice.pdf_path) {
      await adminClient.storage.from("invoices-files").remove([invoice.pdf_path]);
    }

    // 3. Delete from DB
    const { error } = await adminClient.from("invoices").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  })
);
