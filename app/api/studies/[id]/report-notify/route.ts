import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";
import { sendEmail } from "@/lib/mail";

export const POST = withErrorHandler(
  requireAuth(["admin", "agent"], async (req, { adminClient, params }) => {
    const { id } = await params;

    const { data: study, error: studyError } = await adminClient
      .from("studies")
      .select("patient_reference, client_id")
      .eq("id", id)
      .maybeSingle();

    if (studyError || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const { data: clientProfile, error: clientError } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", study.client_id)
      .maybeSingle();

    if (clientError || !clientProfile?.email) {
      return NextResponse.json({ error: "Client email not found" }, { status: 404 });
    }

    const maskPatientReference = (ref: string): string => {
      if (!ref || ref.length < 4) return "****";
      return "***" + ref.slice(-4);
    };

    let maskedRef = "****";
    try {
      const decryptedPatientReference = decrypt(study.patient_reference);
      maskedRef = maskPatientReference(decryptedPatientReference);
    } catch (e) {
      console.error("Error decrypting patient_reference", e);
    }

    await sendEmail({
      to: clientProfile.email,
      subject: "SomnoConnect — Votre rapport d'analyse est disponible",
      html: `
        <p>Bonjour${clientProfile.full_name ? ` ${clientProfile.full_name}` : ""},</p>
        <p>Le rapport d'analyse de votre étude (<strong>${maskedRef}</strong>)
        est maintenant disponible dans votre espace client SomnoConnect.</p>
        <p>Merci de votre confiance.</p>
        <p>— L'équipe SOMNOVENTIS</p>
      `,
    });

    return NextResponse.json({ success: true, sent: true });
  })
);
