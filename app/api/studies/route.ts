import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { encrypt } from "@/lib/encryption";
import { studySchema } from "@/lib/validation";

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient }) => {
    let query = adminClient
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, institution_id)")
      .order("created_at", { ascending: false });

    if (profile.role === "client") {
      query = query.eq("client_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ studies: data });
  })
);

export const POST = withErrorHandler(
  requireAuth(["client", "admin"], { schema: studySchema }, async (req, { user, profile, adminClient, validatedData }) => {
    const { patient_reference, study_type, priority, notes, client_id } = validatedData!;
    
    const finalClientId = profile.role === "admin" ? (client_id || user.id) : user.id;
    const encryptedRef = encrypt(patient_reference);

    const { data, error } = await adminClient
      .from("studies")
      .insert({
        patient_reference: encryptedRef,
        study_type,
        priority,
        notes,
        client_id: finalClientId,
        status: "en_attente",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ study: data }, { status: 201 });
  })
);
