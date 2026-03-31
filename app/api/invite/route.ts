import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { createInvitation } from "@/lib/supabase/invitations";
import { limiters } from "@/lib/rateLimit";

export const POST = withErrorHandler(
  requireAuth(["admin"], async (req, { user, profile, adminClient }) => {
    const rl = await limiters.invite.check(`invite:${user.id}`);
    if (!rl.allowed) return NextResponse.json({ error: "Too many invitations sent. Try again in 1 hour." }, { status: 429, headers: rl.headers });

    const body = await req.json();
    const { email, institution_id, full_name } = body as { email?: string; institution_id?: string | null; full_name?: string | null };
    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

    if (!profile.institution_id) return NextResponse.json({ error: "Admin account has no institution" }, { status: 400 });

    const result = await createInvitation({
      email,
      institution_id: institution_id ?? profile.institution_id,
      full_name: full_name ?? null,
      created_by: user.id,
    });

    return NextResponse.json({ success: true, token: result.token });
  })
);
