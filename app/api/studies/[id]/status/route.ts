import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Verify the role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (
      profileError ||
      !profile ||
      !["agent", "admin"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const body = (await req.json()) as { status?: string };
    const status = body.status;
    if (status !== "en_cours" && status !== "termine" && status !== "annule") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // Retrieve old status
    const { data: oldStudy, error: oldError } = await supabase
      .from("studies")
      .select("status")
      .eq("id", id)
      .single();
    if (oldError || !oldStudy) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }
    // State machine: validate transition
    const validTransitions: Record<string, string[]> = {
      en_attente: ["en_cours", "annule"],
      en_cours: ["termine", "annule"],
      termine: [],
      annule: [],
    };
    const allowed = validTransitions[oldStudy.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid transition: ${oldStudy.status} → ${status}` },
        { status: 422 },
      );
    }
    // Update the study
    const updateFields: {
      status: string;
      updated_at: string;
      completed_at?: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "termine") {
      updateFields.completed_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase
      .from("studies")
      .update(updateFields)
      .eq("id", id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    // History
    await supabase.from("study_history").insert({
      study_id: id,
      old_status: oldStudy.status,
      new_status: status,
      changed_by: user.id,
      changed_at: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STATUS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
