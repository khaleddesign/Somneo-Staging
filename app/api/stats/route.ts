import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      { count: total_studies },
      { count: en_attente },
      { count: en_attente_non_assignees },
      { count: en_cours },
      { count: termine },
      { count: termine_ce_mois },
      { count: this_week },
      { data: completedStudies },
      { count: total_clients },
      { count: total_agents },
    ] = await Promise.all([
      adminClient.from("studies").select("*", { count: "exact", head: true }),
      adminClient.from("studies").select("*", { count: "exact", head: true }).eq("status", "en_attente"),
      adminClient.from("studies").select("*", { count: "exact", head: true }).eq("status", "en_attente").is("assigned_agent_id", null),
      adminClient.from("studies").select("*", { count: "exact", head: true }).eq("status", "en_cours"),
      adminClient.from("studies").select("*", { count: "exact", head: true }).eq("status", "termine"),
      adminClient.from("studies").select("*", { count: "exact", head: true }).eq("status", "termine").gte("completed_at", startOfMonth.toISOString()),
      adminClient.from("studies").select("*", { count: "exact", head: true }).gte("submitted_at", oneWeekAgo.toISOString()),
      adminClient.from("studies").select("submitted_at, completed_at").eq("status", "termine").not("completed_at", "is", null),
      adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("role", "client").eq("is_suspended", false),
      adminClient.from("profiles").select("*", { count: "exact", head: true }).in("role", ["agent", "admin"]).eq("is_suspended", false),
    ]);

    let avg_turnaround = 0;
    if (completedStudies && completedStudies.length > 0) {
      const total = completedStudies.reduce((sum: number, s: any) => {
        if (!s.submitted_at || !s.completed_at) return sum;
        return sum + (new Date(s.completed_at).getTime() - new Date(s.submitted_at).getTime()) / (1000 * 60 * 60);
      }, 0);
      avg_turnaround = total / completedStudies.length;
    }

    return NextResponse.json(
      {
        total_studies: total_studies || 0,
        en_attente: en_attente || 0,
        en_attente_non_assignees: en_attente_non_assignees || 0,
        en_cours: en_cours || 0,
        termine: termine || 0,
        termine_ce_mois: termine_ce_mois || 0,
        this_week: this_week || 0,
        avg_turnaround: Math.round(avg_turnaround * 10) / 10,
        total_clients: total_clients || 0,
        total_agents: total_agents || 0,
      },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  })
);
