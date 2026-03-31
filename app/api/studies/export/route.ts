import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";

export const GET = withErrorHandler(
  requireAuth(["admin", "agent"], async (req, { user, profile, adminClient }) => {
    const isAdmin = profile.role === "admin";
    
    let query = adminClient
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("assigned_agent_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const decrypted = (data ?? []).map((s: any) => ({
      ...s,
      patient_reference: decrypt(s.patient_reference),
    }));

    return NextResponse.json({ studies: decrypted });
  })
);
