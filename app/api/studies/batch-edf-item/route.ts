import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

const ALLOWED_STUDY_TYPES = ["PSG", "PV", "MSLT", "MWT"];
const ALLOWED_PRIORITIES = ["low", "medium", "high"];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const patient_reference = String(body?.patient_reference ?? "").trim();
    const study_type = String(body?.study_type ?? "").trim();
    const priority = String(body?.priority ?? "medium").trim();
    const notes = body?.notes ? String(body.notes).trim() : null;
    const file_path = String(body?.file_path ?? "").trim();
    const file_size_orig = Number(body?.file_size_orig ?? 0);
    const checksum = String(body?.checksum ?? "").trim();

    if (!patient_reference) {
      return NextResponse.json(
        { error: "patient_reference requis" },
        { status: 400 },
      );
    }
    if (!ALLOWED_STUDY_TYPES.includes(study_type)) {
      return NextResponse.json(
        {
          error: `study_type invalide. Valeurs acceptées: ${ALLOWED_STUDY_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "priority invalide" }, { status: 400 });
    }
    if (!file_path || !checksum) {
      return NextResponse.json(
        { error: "file_path et checksum requis" },
        { status: 400 },
      );
    }

    const encryptedPatientReference = encrypt(patient_reference);

    const { data, error: insertError } = await supabase
      .from("studies")
      .insert({
        client_id: user.id,
        patient_reference: encryptedPatientReference,
        study_type,
        priority,
        status: "en_attente",
        file_path,
        file_size_orig,
        checksum,
        notes,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[POST /api/studies/batch-edf-item]", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
