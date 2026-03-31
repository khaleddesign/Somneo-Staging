import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const batchEdfItemSchema = z.object({
  patient_reference: z.string().min(1),
  study_type: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().optional(),
});

export const POST = withErrorHandler(
  requireAuth(["admin", "agent", "client"], { schema: batchEdfItemSchema }, async (req, { user, adminClient, validatedData }) => {
    const { patient_reference, study_type, file_path, file_size } = validatedData!;

    const { data, error } = await adminClient
      .from("studies")
      .insert({
        client_id: user.id,
        patient_reference: encrypt(patient_reference),
        study_type,
        file_path,
        file_size: file_size || 0,
        status: "soumis",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ study: data });
  })
);
