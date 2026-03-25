import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/mail";

/**
 * POST /api/studies/batch-edf-notify
 * Called by the client after a batch EDF upload completes.
 * Notifies all agents/admins of the same institution.
 */
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
    const successCount = Number(body?.success_count ?? 0);
    const totalCount = Number(body?.total_count ?? 0);

    const admin = createAdminClient();

    // Get client profile (email + institution)
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("email, full_name, institution_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!clientProfile || clientProfile.role !== "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!clientProfile.institution_id) {
      return NextResponse.json({ success: true, sent: 0 }); // no institution, skip
    }

    // Get all agents + admins in the same institution
    const { data: agents } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("institution_id", clientProfile.institution_id)
      .in("role", ["agent", "admin"])
      .eq("is_active", true);

    if (!agents || agents.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    const clientName = clientProfile.full_name || clientProfile.email;
    const subject = `SomnoConnect — ${successCount} new EDF file${successCount > 1 ? "s" : ""} received`;
    const message = `
      <p>Hello,</p>
      <p><strong>${clientName}</strong> has submitted a batch of <strong>${successCount} EDF file${successCount > 1 ? "s" : ""}</strong>
      ${totalCount > successCount ? ` (${totalCount - successCount} failed)` : ""} on SomnoConnect.</p>
      <p>Log in to the dashboard to process the new studies.</p>
      <p>— SomnoConnect by SOMNOVENTIS</p>
    `;

    // Fire-and-forget to all agents
    const sends = agents.map((agent) =>
      sendEmail({ to: agent.email, subject, html: message }).catch(() => {}),
    );
    await Promise.allSettled(sends);

    return NextResponse.json({ success: true, sent: agents.length });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
