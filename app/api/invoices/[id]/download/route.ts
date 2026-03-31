import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { logAudit } from "@/lib/audit";

export const GET = withErrorHandler(
  requireAuth(["admin", "client"], async (req, { user, profile, adminClient, params }) => {
    const { id } = await params;

    const { data: invoice, error: invoiceError } = await adminClient
      .from("invoices")
      .select("pdf_path, client_id")
      .eq("id", id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // RLS-like check for client
    if (profile.role === "client" && invoice.client_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!invoice.pdf_path) {
      return NextResponse.json({ error: "PDF unavailable" }, { status: 404 });
    }

    const storagePath = invoice.pdf_path.startsWith("invoices-files/")
      ? invoice.pdf_path.slice("invoices-files/".length)
      : invoice.pdf_path;

    const { data: signed, error: signedError } = await adminClient.storage
      .from("invoices-files")
      .createSignedUrl(storagePath, 15 * 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { error: signedError?.message || "Unable to generate signed URL" },
        { status: 500 },
      );
    }

    // Audit (non-blocking)
    logAudit(user.id, "download_invoice", "invoice", id).catch(err => console.error("[Audit Error]", err));

    return NextResponse.json({ url: signed.signedUrl });
  })
);
