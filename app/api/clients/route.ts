import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is agent or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isAdmin = profile.role === "admin";

    // Retrieve all clients
    const admin = createAdminClient();
    const { data: clients, error } = await admin
      .from("profiles")
      .select("id, full_name, email, institution_id, created_at, is_suspended")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!isAdmin) {
      return NextResponse.json({ clients });
    }

    const clientIds = (clients || []).map((client) => client.id);

    const { data: institutions } = await admin
      .from("institutions")
      .select("id, name");

    const institutionMap = new Map(
      (institutions || []).map((inst) => [inst.id, inst.name]),
    );

    const { data: studies } = clientIds.length
      ? await admin
          .from("studies")
          .select("client_id, submitted_at")
          .in("client_id", clientIds)
      : { data: [] };

    const enriched = (clients || []).map((client) => {
      const mine = (studies || []).filter(
        (study) => study.client_id === client.id,
      );
      const sortedDates = mine
        .map((study) => study.submitted_at)
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b as string).getTime() - new Date(a as string).getTime(),
        );

      return {
        ...client,
        institution_name: client.institution_id
          ? institutionMap.get(client.institution_id) || "—"
          : "—",
        studies_count: mine.length,
        last_study_at: sortedDates[0] || null,
      };
    });

    return NextResponse.json({ clients: enriched });
  } catch (err: unknown) {
    console.error("[GET /api/clients]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { user_id, is_suspended, full_name, email } = body as {
      user_id?: string;
      is_suspended?: boolean;
      full_name?: string;
      email?: string;
    };
    if (typeof user_id !== "string") {
      return NextResponse.json({ error: "user_id requis" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user is agent or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["agent", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update the client
    const admin = createAdminClient();
    const payload: Record<string, unknown> = {};

    if (typeof is_suspended === "boolean") payload.is_suspended = is_suspended;
    if (typeof full_name === "string") payload.full_name = full_name;
    if (typeof email === "string") payload.email = email.trim().toLowerCase();

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No update requested" },
        { status: 400 },
      );
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update(payload)
      .eq("id", user_id)
      .eq("role", "client");

    if (updateErr) throw updateErr;

    if (typeof email === "string") {
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(
        user_id,
        {
          email: email.trim().toLowerCase(),
        },
      );
      if (authUpdateError) {
        console.error(
          "[PATCH /api/clients] auth update error",
          authUpdateError,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[PATCH /api/clients]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 },
    );
  }
}
