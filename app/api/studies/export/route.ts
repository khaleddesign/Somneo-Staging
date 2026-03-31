import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";

export const GET = withErrorHandler(
  requireAuth(["admin", "agent"], async (req, { user, profile, adminClient }) => {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";
    const customMonth = searchParams.get("customMonth"); // YYYY-MM
    
    const isAdmin = profile.role === "admin";
    console.log(`[EXPORT] User: ${user.id}, Role: ${profile.role}, Period: ${period}, CustomMonth: ${customMonth}`);
    
    // On simplifie la requête pour éviter les erreurs de jointure potentielles au début
    let query = adminClient
      .from("studies")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("assigned_agent_id", user.id);
    }

    // Filtrage par période
    const now = new Date();
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("submitted_at", startOfMonth);
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      query = query.gte("submitted_at", startOfYear);
    } else if (period === "custom" && customMonth) {
      const [year, month] = customMonth.split("-").map(Number);
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      query = query.gte("submitted_at", startOfMonth).lte("submitted_at", endOfMonth);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[EXPORT] Supabase Error:", error);
      throw error;
    }

    console.log(`[EXPORT] Found ${data?.length || 0} studies before decryption`);

    const decrypted = (data ?? []).map((s: any) => {
      let patientRef = "Error";
      try {
        patientRef = decrypt(s.patient_reference);
      } catch (e) {
        console.error(`[EXPORT] Decryption failed for study ${s.id}:`, e);
        patientRef = "Decryption Error";
      }
      return {
        ...s,
        patient_reference: patientRef,
        client_name: "—", // On simplifie pour le moment
      };
    });

    return NextResponse.json({ studies: decrypted });
  })
);
