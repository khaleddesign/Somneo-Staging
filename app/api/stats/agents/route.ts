import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient }) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      { data: agents, error: agentsError },
      { data: inProgressStudies, error: inProgressError },
      { data: completedThisMonth, error: completedError },
      { data: completedAll, error: completedAllError },
    ] = await Promise.all([
      adminClient.from("profiles").select("id, full_name, email").eq("role", "agent").order("full_name", { ascending: true }),
      adminClient.from("studies").select("assigned_agent_id, updated_at").eq("status", "en_cours").not("assigned_agent_id", "is", null),
      adminClient.from("studies").select("assigned_agent_id, submitted_at, completed_at, updated_at").eq("status", "termine").not("assigned_agent_id", "is", null).gte("completed_at", startOfMonth.toISOString()),
      adminClient.from("studies").select("assigned_agent_id, submitted_at, completed_at, updated_at").eq("status", "termine").not("assigned_agent_id", "is", null),
    ]);

    if (agentsError) throw agentsError;
    if (inProgressError) throw inProgressError;
    if (completedError) throw completedError;
    if (completedAllError) throw completedAllError;

    const inProgressByAgent = new Map<string, number>();
    const completedByAgent = new Map<string, number>();
    const completedTotalByAgent = new Map<string, number>();
    const avgByAgent = new Map<string, number>();
    const lastActivityByAgent = new Map<string, string>();

    for (const row of inProgressStudies || []) {
      if (!row.assigned_agent_id) continue;
      inProgressByAgent.set(row.assigned_agent_id, (inProgressByAgent.get(row.assigned_agent_id) || 0) + 1);
      if (row.updated_at) {
        const current = lastActivityByAgent.get(row.assigned_agent_id);
        if (!current || new Date(row.updated_at).getTime() > new Date(current).getTime()) lastActivityByAgent.set(row.assigned_agent_id, row.updated_at);
      }
    }

    for (const row of completedAll || []) {
      if (!row.assigned_agent_id) continue;
      completedTotalByAgent.set(row.assigned_agent_id, (completedTotalByAgent.get(row.assigned_agent_id) || 0) + 1);
      if (row.submitted_at && row.completed_at) {
        const duration = (new Date(row.completed_at).getTime() - new Date(row.submitted_at).getTime()) / (1000 * 60 * 60);
        avgByAgent.set(row.assigned_agent_id, (avgByAgent.get(row.assigned_agent_id) || 0) + duration);
      }
    }

    const perAgent = (agents || []).map((agent: any) => ({
      agent_id: agent.id,
      agent_name: agent.full_name || agent.email || "Agent",
      en_cours: inProgressByAgent.get(agent.id) || 0,
      termine_total: completedTotalByAgent.get(agent.id) || 0,
      avg_turnaround: (completedTotalByAgent.get(agent.id) || 0) > 0 ? Math.round(((avgByAgent.get(agent.id) || 0) / (completedTotalByAgent.get(agent.id) || 1)) * 10) / 10 : 0,
      last_activity: lastActivityByAgent.get(agent.id) || null,
    }));

    return NextResponse.json({ agents: perAgent }, { headers: { "Cache-Control": "private, max-age=60" } });
  })
);
