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
    
    // Utilisation de created_at car submitted_at n'existe peut-être pas dans toutes les versions
    let query = adminClient
      .from("studies")
      .select("*, profiles!studies_client_id_fkey(full_name, email)")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("assigned_agent_id", user.id);
    }

    // Filtrage par période
    const now = new Date();
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      query = query.gte("created_at", startOfMonth);
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      query = query.gte("created_at", startOfYear);
    } else if (period === "custom" && customMonth) {
      const [year, month] = customMonth.split("-").map(Number);
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      query = query.gte("created_at", startOfMonth).lte("created_at", endOfMonth);
    }

    const { data, error } = await query;
    if (error) throw error;

    const decrypted = (data ?? []).map((s: any) => {
      let patientRef = "Error";
      try {
        // Tentative de décryptage, sinon on garde la valeur brute si elle n'est pas cryptée
        patientRef = decrypt(s.patient_reference);
      } catch (e) {
        patientRef = s.patient_reference || "—";
      }
      
      return {
        ...s,
        patient_reference: patientRef,
        // submitted_at est utilisé par le frontend, on s'assure qu'il existe
        submitted_at: s.submitted_at || s.created_at,
        client_name: s.profiles?.full_name || s.profiles?.email || "—",
      };
    });

    return NextResponse.json({ studies: decrypted });
  })
);
