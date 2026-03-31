import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient, profile }) => {
    const isAdmin = profile.role === "admin";

    const { data: agents, error } = await adminClient
      .from("profiles")
      .select("id, full_name, email, created_at, is_suspended")
      .in("role", ["agent", "admin"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!isAdmin) {
      return NextResponse.json({ agents });
    }

    const agentIds = (agents || []).map((a) => a.id);
    const { data: studies } = agentIds.length
      ? await adminClient
          .from("studies")
          .select("assigned_agent_id, status, submitted_at, completed_at, updated_at")
          .in("assigned_agent_id", agentIds)
      : { data: [] };

    const mapped = (agents || []).map((agent) => {
      const mine = (studies || []).filter((s) => s.assigned_agent_id === agent.id);
      const enCours = mine.filter((s) => s.status === "en_cours").length;
      const termine = mine.filter((s) => s.status === "termine").length;
      const completedWithDates = mine.filter((s) => s.status === "termine" && s.submitted_at && s.completed_at);
      
      const avgTurnaround = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, s) => {
            const submitted = new Date(s.submitted_at!).getTime();
            const completed = new Date(s.completed_at!).getTime();
            return sum + (completed - submitted) / (1000 * 60 * 60);
          }, 0) / completedWithDates.length
        : 0;

      const lastActivityIso = mine
        .map((s) => s.updated_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

      return {
        ...agent,
        en_cours: enCours,
        termine,
        avg_turnaround: Math.round(avgTurnaround * 10) / 10,
        last_activity: lastActivityIso,
      };
    });

    return NextResponse.json({ agents: mapped });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient, user }) => {
    const body = await req.json();
    const { id, full_name, email, is_suspended } = body as {
      id?: string;
      full_name?: string;
      email?: string;
      is_suspended?: boolean;
    };

    if (!id) return NextResponse.json({ error: "ID agent requis" }, { status: 400 });
    if (id === user.id) return NextResponse.json({ error: "Suppression de votre propre compte impossible" }, { status: 400 });

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof full_name === "string") updatePayload.full_name = full_name;
    if (typeof email === "string") updatePayload.email = email.trim().toLowerCase();
    if (typeof is_suspended === "boolean") updatePayload.is_suspended = is_suspended;

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .in("role", ["agent", "admin"]);

    if (profileError) throw profileError;

    if (typeof email === "string") {
      await adminClient.auth.admin.updateUserById(id, { email: email.trim().toLowerCase() });
    }

    return NextResponse.json({ success: true });
  })
);

export const DELETE = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID agent requis" }, { status: 400 });

    const { count: inProgressCount, error: countError } = await adminClient
      .from("studies")
      .select("*", { count: "exact", head: true })
      .eq("assigned_agent_id", id)
      .eq("status", "en_cours");

    if (countError) throw countError;
    if ((inProgressCount || 0) > 0) {
      return NextResponse.json({ error: "Deletion impossible: active studies are still assigned" }, { status: 409 });
    }

    await adminClient.from("studies").update({ assigned_agent_id: null, updated_at: new Date().toISOString() }).eq("assigned_agent_id", id);
    await adminClient.from("profiles").update({ is_suspended: true, is_active: false, updated_at: new Date().toISOString() }).eq("id", id).in("role", ["agent", "admin"]);
    await adminClient.auth.admin.deleteUser(id);

    return NextResponse.json({ success: true });
  })
);
