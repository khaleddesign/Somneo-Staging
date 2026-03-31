import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { studySchema } from "@/lib/validation";
import { encrypt } from "@/lib/encryption";

export const POST = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient }) => {
    const raw = await req.json();
    const parsed = studySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });

    const { patient_reference, study_type, notes, priority } = parsed.data;
    let client_id: string;

    if (profile.role === "client") {
      client_id = user.id;
    } else {
      const bodyClientId = raw.client_id as string | undefined;
      if (!bodyClientId) return NextResponse.json({ error: "client_id requis pour les agents/admins" }, { status: 400 });

      const { data: clientProfile } = await adminClient.from("profiles").select("id, role, institution_id").eq("id", bodyClientId).maybeSingle();
      if (!clientProfile || clientProfile.role !== "client") return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
      if (clientProfile.institution_id !== profile.institution_id) return NextResponse.json({ error: "Access denied : client hors institution" }, { status: 403 });
      
      client_id = bodyClientId;
    }

    const { data, error } = await adminClient
      .from("studies")
      .insert({
        client_id,
        patient_reference: encrypt(patient_reference),
        study_type,
        notes: notes ?? "",
        priority,
        status: "en_attente",
      })
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ study_id: data.id });
  })
);
