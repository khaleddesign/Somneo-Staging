import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient, profile }) => {
    const isAdmin = profile.role === "admin";

    const { data: clients, error } = await adminClient
      .from("profiles")
      .select("id, full_name, email, institution_id, created_at, is_suspended")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!isAdmin) return NextResponse.json({ clients });

    const clientIds = (clients || []).map((c) => c.id);
    const { data: institutions } = await adminClient.from("institutions").select("id, name");
    const institutionMap = new Map((institutions || []).map((inst) => [inst.id, inst.name]));

    const { data: studies } = clientIds.length
      ? await adminClient.from("studies").select("client_id, submitted_at").in("client_id", clientIds)
      : { data: [] };

    const enriched = (clients || []).map((client) => {
      const mine = (studies || []).filter((s) => s.client_id === client.id);
      const sortedDates = mine
        .map((s) => s.submitted_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

      return {
        ...client,
        institution_name: client.institution_id ? institutionMap.get(client.institution_id) || "—" : "—",
        studies_count: mine.length,
        last_study_at: sortedDates[0] || null,
      };
    });

    return NextResponse.json({ clients: enriched });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const body = await req.json();
    const { user_id, is_suspended, full_name, email } = body as {
      user_id?: string;
      is_suspended?: boolean;
      full_name?: string;
      email?: string;
    };

    if (!user_id) return NextResponse.json({ error: "user_id requis" }, { status: 400 });

    const payload: Record<string, any> = {};
    if (typeof is_suspended === "boolean") payload.is_suspended = is_suspended;
    if (typeof full_name === "string") payload.full_name = full_name;
    if (typeof email === "string") payload.email = email.trim().toLowerCase();

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No update requested" }, { status: 400 });
    }

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update(payload)
      .eq("id", user_id)
      .eq("role", "client");

    if (updateErr) throw updateErr;

    if (typeof email === "string") {
      await adminClient.auth.admin.updateUserById(user_id, { email: email.trim().toLowerCase() });
    }

    return NextResponse.json({ success: true });
  })
);
