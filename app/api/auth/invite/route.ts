import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInvitation } from "@/lib/supabase/invitations";
import { limiters } from "@/lib/rateLimit";

type Body = {
  email?: string;
  institution_id?: string | null;
  full_name?: string | null;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const { email, institution_id, full_name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const server = await createClient();
    const { data: userData, error: userErr } = await server.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    const rl = await limiters.invite.check(`invite:${userId}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many invitations sent. Try again in 1 hour." },
        { status: 429, headers: rl.headers },
      );
    }

    // Seuls les admins peuvent inviter
    const { data: profile, error: profErr } = await server
      .from("profiles")
      .select("role, institution_id")
      .eq("id", userId)
      .maybeSingle();

    if (profErr)
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Reserved for administrators" },
        { status: 403 },
      );
    }
    if (!profile.institution_id) {
      return NextResponse.json(
        { error: "Admin account has no institution" },
        { status: 400 },
      );
    }

    const result = await createInvitation({
      email,
      institution_id: institution_id ?? profile.institution_id,
      full_name: full_name ?? null,
      created_by: userId,
    });

    // Retourner le token UNIQUEMENT pour que l'admin puisse l'afficher dans l'interface UI
    return NextResponse.json({ success: true, token: result.token });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
