import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { updateProfileSchema } from "@/lib/validation";

export const GET = withErrorHandler(
  requireAuth(["agent", "admin"], async (req, { adminClient }) => {
    const { data: clients, error } = await adminClient
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("full_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ clients });
  })
);

export const PATCH = withErrorHandler(
  requireAuth(["admin"], { schema: updateProfileSchema }, async (req, { adminClient, validatedData }) => {
    const { id, ...updates } = validatedData!;

    const { data, error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .eq("role", "client")
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ client: data });
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
      .eq("role", "client");

    if (error) throw error;
    return NextResponse.json({ success: true });
  })
);
