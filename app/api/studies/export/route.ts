import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { decrypt } from "@/lib/encryption";

export const GET = withErrorHandler(
  requireAuth(["admin", "agent"], async (req, { user, profile, adminClient }) => {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";
    const customMonth = searchParams.get("customMonth");
    
    const isAdmin = profile.role === "admin";
    console.log(`[EXPORT_DEBUG] UserID: ${user.id}, Role: ${profile.role}, Period: ${period}`);

    // ÉTAPE 1 : Requête la plus simple possible sans aucun filtre ni jointure
    // On utilise adminClient qui contourne normalement le RLS
    const { data: allStudies, error: dbError } = await adminClient
      .from("studies")
      .select("*");

    if (dbError) {
      console.error("[EXPORT_DEBUG] Database Error:", dbError);
      throw dbError;
    }

    console.log(`[EXPORT_DEBUG] Total studies in DB: ${allStudies?.length || 0}`);

    // ÉTAPE 2 : Filtrage manuel en JS pour être sûr de ce qu'on fait
    let filtered = allStudies || [];

    if (!isAdmin) {
      // On filtre manuellement par agent_id pour être sûr
      filtered = filtered.filter(s => s.assigned_agent_id === user.id);
      console.log(`[EXPORT_DEBUG] After Agent Filter (${user.id}): ${filtered.length}`);
    }

    // Filtrage par période (manuel pour éviter les erreurs de format SQL)
    const now = new Date();
    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(s => new Date(s.created_at) >= startOfMonth);
    } else if (period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(s => new Date(s.created_at) >= startOfYear);
    } else if (period === "custom" && customMonth) {
      const [year, month] = customMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      filtered = filtered.filter(s => {
        const d = new Date(s.created_at);
        return d >= start && d <= end;
      });
    }

    console.log(`[EXPORT_DEBUG] Final count to return: ${filtered.length}`);

    // ÉTAPE 3 : Préparation des données avec sécurité
    const studies = filtered.map((s: any) => {
      let patientRef = s.patient_reference || "—";
      try {
        // On ne décrypte que si ça ressemble à du crypté (contient un point ou est long)
        if (s.patient_reference && s.patient_reference.includes(".")) {
          patientRef = decrypt(s.patient_reference);
        }
      } catch (e) {
        console.warn(`[EXPORT_DEBUG] Decrypt failed for ${s.id}, using raw.`);
      }
      
      return {
        ...s,
        patient_reference: patientRef,
        submitted_at: s.submitted_at || s.created_at,
        client_name: "—", // On simplifie pour garantir le retour
      };
    });

    return NextResponse.json({ studies });
  })
);
