import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { createInvitation } from "@/lib/supabase/invitations";
import { limiters } from "@/lib/rateLimit";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  institution_id: z.string().optional().nullable(),
  full_name: z.string().optional().nullable(),
});

export const POST = withErrorHandler(
  requireAuth(["admin"], { schema: inviteSchema }, async (req, { user, profile, validatedData }) => {
    const { email, institution_id, full_name } = validatedData!;

    const rl = await limiters.invite.check(`invite:${user.id}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many invitations sent. Try again in 1 hour." },
        { status: 429, headers: rl.headers },
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
      created_by: user.id,
    });

    return NextResponse.json({ success: true, token: result.token });
  })
);
