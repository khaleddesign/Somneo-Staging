import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["en_cours", "termine", "annule"]),
});

export const PATCH = withErrorHandler(
  requireAuth(
    ["agent", "admin"],
    { schema: updateStatusSchema },
    async (req, { adminClient, params, validatedData }) => {
      const { id } = await params;
      const { status } = validatedData!;

      // Retrieve old status
      const { data: oldStudy, error: oldError } = await adminClient
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

      const { error: updateError } = await adminClient
        .from("studies")
        .update(updateFields)
        .eq("id", id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // History
      const {
        data: { user },
      } = await adminClient.auth.getUser();

      await adminClient.from("study_history").insert({
        study_id: id,
        old_status: oldStudy.status,
        new_status: status,
        changed_by: user?.id,
        changed_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }
  )
);
