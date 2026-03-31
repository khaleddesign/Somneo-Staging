import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const batchEdfItemSchema = z.object({
  patient_reference: z.string().min(1),
  study_type: z.string().min(1),
  file_path: z.string().min(1),
  checksum: z.string().min(1),
  file_size_orig: z.number().optional(),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
  notes: z.string().optional().nullable(),
});

export const POST = withErrorHandler(
  requireAuth(["admin", "agent", "client"], { schema: batchEdfItemSchema }, async (req, { user, adminClient, validatedData }) => {
    const { 
      patient_reference, 
      study_type, 
      file_path, 
      checksum,
      file_size_orig, 
      priority, 
      notes 
    } = validatedData!;

    const { data, error } = await adminClient
      .from("studies")
      .insert({
        client_id: user.id,
        patient_reference: encrypt(patient_reference),
        study_type,
        priority,
        status: "en_attente",
        file_path,
        file_size_orig: file_size_orig || 0,
        checksum,
        notes: notes || null,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[POST /api/studies/batch-edf-item] Insert Error:", error);
      throw error;
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  })
);
