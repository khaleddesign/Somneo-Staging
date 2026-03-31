import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { requireAuth } from "@/lib/api/auth";
import { commentSchema } from "@/lib/validation";
import { limiters } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/mail";

async function checkStudyAccess(userId: string, studyId: string, role: string, adminClient: any) {
  const { data: study } = await adminClient
    .from("studies")
    .select("client_id, assigned_agent_id")
    .eq("id", studyId)
    .maybeSingle();

  if (!study) return false;

  return (
    role === "admin" ||
    (role === "agent" && study.assigned_agent_id === userId) ||
    (role === "client" && study.client_id === userId)
  );
}

export const GET = withErrorHandler(
  requireAuth(["client", "agent", "admin"], async (req, { user, profile, adminClient }) => {
    const url = new URL(req.url);
    const study_id = url.searchParams.get("study_id");
    if (!study_id) return NextResponse.json({ error: "study_id is required" }, { status: 400 });

    const hasAccess = await checkStudyAccess(user.id, study_id, profile.role, adminClient);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data, error } = await adminClient
      .from("comments")
      .select("*, profiles!comments_user_id_fkey(full_name, role)")
      .eq("study_id", study_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ comments: data });
  })
);

export const POST = withErrorHandler(
  requireAuth(["client", "agent", "admin"], { schema: commentSchema }, async (req, { user, profile, adminClient, validatedData }) => {
    const rl = await limiters.comment.check(`comment:${user.id}`);
    if (!rl.allowed) return NextResponse.json({ error: "Too many messages. Try again in a minute." }, { status: 429, headers: rl.headers });

    // validatedData is already parsed and validated by requireAuth
    const { study_id, message } = validatedData!;
    
    const hasAccess = await checkStudyAccess(user.id, study_id, profile.role, adminClient);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const { data: comment, error: insertErr } = await adminClient
      .from("comments")
      .insert({ study_id, message, user_id: user.id })
      .select("*, profiles!comments_user_id_fkey(full_name, role, email)")
      .single();

    if (insertErr) throw insertErr;

    // Fire-and-forget notifications
    (async () => {
      try {
        const { data: studyData } = await adminClient.from("studies").select("client_id, assigned_agent_id").eq("id", study_id).single();
        if (profile.role === "client") {
          if (studyData?.assigned_agent_id) {
            await adminClient.from("notifications").insert({ user_id: studyData.assigned_agent_id, title: "New client message", message: `You received a message for study ${study_id}` });
          }
          await sendEmail({ to: "contact@somnoventis.com", subject: "New client message on SomnoConnect", html: `<p>A client posted a new comment for study ${study_id}.</p>` });
        } else {
          if (studyData?.client_id) {
            await adminClient.from("notifications").insert({ user_id: studyData.client_id, title: "New reply", message: "An agent replied to your study." });
            const { data: clientProf } = await adminClient.from("profiles").select("email").eq("id", studyData.client_id).single();
            if (clientProf?.email) await sendEmail({ to: clientProf.email, subject: "New agent message on SomnoConnect", html: `<p>An agent posted a new comment for your study.</p>` });
          }
        }
      } catch (e) { console.error("Notification error", e); }
    })();

    return NextResponse.json({ comment });
  })
);
