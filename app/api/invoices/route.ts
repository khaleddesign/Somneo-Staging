import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/encryption";
import { idempotencyStore } from "@/lib/idempotency";
import { generateInvoiceNumber } from "@/lib/invoices/numbering";
import { toDateYmd } from "@/lib/utils/date";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/components/invoices/InvoicePDF";

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
  requireAuth(["agent", "admin"], async (req, { user, adminClient }) => {
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const cached = await idempotencyStore.get(idempotencyKey);
      if (cached) return NextResponse.json(cached.body, { status: cached.status });
    }

    const body = await req.json();
    const { clientId, mode, billingMonth, studyIds } = body;

    if (!clientId || !mode) return NextResponse.json({ error: "clientId and mode are required" }, { status: 400 });

    let studies: any[] = [];
    if (mode === "manual") {
      if (!studyIds || !Array.isArray(studyIds)) return NextResponse.json({ error: "studyIds required for manual mode" }, { status: 400 });
      const { data } = await adminClient.from("studies").select("*").in("id", studyIds);
      studies = data ?? [];
    } else {
      if (!billingMonth) return NextResponse.json({ error: "billingMonth required for monthly mode" }, { status: 400 });
      const [year, month] = billingMonth.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59).toISOString();
      const { data } = await adminClient.from("studies").select("*").eq("client_id", clientId).eq("status", "termine").gte("completed_at", start).lte("completed_at", end);
      studies = data ?? [];
    }

    if (studies.length === 0) return NextResponse.json({ error: "No billable studies found" }, { status: 400 });

    const uniqueTypes = [...new Set(studies.map((s) => s.study_type))];
    const { data: settings } = await adminClient.from("invoice_settings").select("study_type, price_ht").in("study_type", uniqueTypes);
    const priceMap = new Map((settings ?? []).map((s: any) => [s.study_type, Number(s.price_ht ?? 0)]));

    const subtotal = studies.reduce((acc, s) => acc + (priceMap.get(s.study_type) ?? 0), 0);
    const totalTtc = subtotal; // TVA 0% for now
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

    // PDF Generation & Storage (simplified for brevity, keeping original logic)
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

    if (idempotencyKey) await idempotencyStore.set(idempotencyKey, { invoice: updatedInvoice }, 201);

    return NextResponse.json({ invoice: updatedInvoice }, { status: 201 });
  })
);
