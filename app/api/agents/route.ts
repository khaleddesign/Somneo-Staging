import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { updateProfileSchema } from "@/lib/validation";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient, profile }) => {
    const isAdmin = profile.role === "admin";

    const { data: agents, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "agent")
      .order("full_name", { ascending: true });

    if (error) throw error;

    // Filter sensitive data if not admin
    const filtered = isAdmin
      ? agents
      : agents.map(({ id, full_name, email, institution_id }: any) => ({
          id,
          full_name,
          email,
          institution_id,
        }));

    return NextResponse.json({ agents: filtered });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["admin"], { schema: updateProfileSchema }, async (req, { adminClient, validatedData }) => {
    const { id, ...updates } = validatedData!;

    const { data, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .eq("role", "agent")
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ agent: data });
  })
);

export const DELETE = withErrorHandler(
  requireAuth(["admin"], async (req, { adminClient }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const { error } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("role", "agent");

    if (error) throw error;
    return NextResponse.json({ success: true });
  })
);
