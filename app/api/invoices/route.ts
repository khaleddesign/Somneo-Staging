import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { withIdempotency, makeSupabaseIdempotencyStore } from "@/lib/idempotency";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { invoiceSchema } from "@/lib/validation";

function toDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function generateInvoiceNumber(admin: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAC-${year}-`;
  const { data: latest, error } = await admin
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;

  let nextNum = 1;
  if (latest?.invoice_number) {
    const lastPart = latest.invoice_number.split("-").pop();
    if (lastPart) nextNum = parseInt(lastPart, 10) + 1;
  }
  return `${prefix}${nextNum.toString().padStart(4, "0")}`;
}

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const { data, error } = await adminClient
      .from("invoices")
      .select("*, profiles!invoices_client_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ invoices: data });
  })
);

export const POST = withErrorHandler(
  requireAuth(["agent", "admin"], { schema: invoiceSchema }, async (req, { user, adminClient, validatedData }) => {
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (!idempotencyKey) {
      return NextResponse.json({ error: "X-Idempotency-Key header required" }, { status: 400 });
    }

    const { clientId, mode, billingMonth, studyIds } = validatedData!;
    const store = makeSupabaseIdempotencyStore(adminClient);
    
    const result = await withIdempotency(idempotencyKey, async () => {
      let studies: any[] = [];
      if (mode === "manual") {
        if (!studyIds || !Array.isArray(studyIds)) throw new Error("studyIds required for manual mode");
        const { data } = await adminClient.from("studies").select("*").in("id", studyIds);
        studies = data ?? [];
      } else {
        if (!billingMonth) throw new Error("billingMonth required for monthly mode");
        const [year, month] = billingMonth.split("-");
        const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
        const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
        const { data } = await adminClient.from("studies").select("*").eq("client_id", clientId).eq("status", "termine").gte("completed_at", start).lte("completed_at", end);
        studies = data ?? [];
      }

      if (studies.length === 0) throw new Error("No billable studies found");

      const uniqueTypes = [...new Set(studies.map((s) => s.study_type))];
      const { data: settings } = await adminClient.from("invoice_settings").select("study_type, price_ht").in("study_type", uniqueTypes);
      const priceMap = new Map((settings ?? []).map((s: any) => [s.study_type, Number(s.price_ht ?? 0)]));

      const subtotal = studies.reduce((acc, s) => acc + (priceMap.get(s.study_type) ?? 0), 0);
      const totalTtc = subtotal;
      const invoiceNumber = await generateInvoiceNumber(adminClient);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: created, error: createError } = await adminClient
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          client_id: clientId,
          mode,
          billing_month: billingMonth || null,
          study_ids: studies.map((s) => s.id),
          subtotal_ht: Number(subtotal.toFixed(2)),
          tva_rate: 0,
          total_ttc: Number(totalTtc.toFixed(2)),
          status: "draft",
          due_date: toDateYmd(dueDate),
          created_by: user.id,
        })
        .select("*")
        .single();

      if (createError) throw createError;

      const { data: clientData } = await adminClient.from("profiles").select("full_name, email").eq("id", clientId).maybeSingle();
      const pricesByType = Object.fromEntries((settings ?? []).map((s: any) => [s.study_type, Number(s.price_ht ?? 0)]));
      
      const pdfBuffer = await renderToBuffer(
        React.createElement(InvoicePDF, {
          invoice: { ...created, subtotal_ht: Number(created.subtotal_ht), tva_rate: 0, total_ttc: Number(created.total_ttc) },
          studies: studies.map(s => ({ ...s, patient_reference: decrypt(s.patient_reference ?? "") })),
          client: clientData ?? { full_name: null, email: null },
          pricesByType,
        }) as any
      );

      const fileName = `${created.invoice_number}.pdf`;
      await adminClient.storage.from("invoices-files").upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });
      
      const { data: updatedInvoice } = await adminClient.from("invoices").update({ pdf_path: fileName, updated_at: new Date().toISOString() }).eq("id", created.id).select("*").single();

      return { invoice: updatedInvoice };
    }, store);

    return NextResponse.json(result.data, { status: result.cached ? 200 : 201 });
  })
);
