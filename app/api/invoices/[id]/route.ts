import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";

export const GET = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient, params }) => {
    const { id } = await params;
    const { data: invoice, error } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

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
  requireAuth(["admin"], async (req, { adminClient, params }) => {
    const { id } = await params;
    const body = await req.json();
    if (!body.status || !["sent", "paid", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "status invalide" }, { status: 400 });
    }

    const { data: updated, error } = await adminClient
      .from("invoices")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ invoice: updated });
  })
);
