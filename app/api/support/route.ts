import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

interface Body {
  subject?: string;
  message?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const subject = body.subject?.trim();
    const message = body.message?.trim();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 },
      );
    }

    const userName = profile?.full_name || "SomnoConnect User";

    const supportEmail = await resend.emails.send({
      from: "no-reply@somnoventis.com",
      to: "contact@somnoventis.com",
      subject: `[SomnoConnect Support] ${subject}`,
      html: `
        <p><strong>From:</strong> ${userName} (${userEmail})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
    });

    if (supportEmail.error) {
      console.error("[support] Error sending email:", supportEmail.error);
      return NextResponse.json(
        { error: "Error lors de l'envoi de l'email support" },
        { status: 500 },
      );
    }

    const confirmationEmail = await resend.emails.send({
      from: "no-reply@somnoventis.com",
      to: userEmail,
      subject: "SomnoConnect - Support request received",
      html: `
        <p>Hello ${userName},</p>
        <p>We have received your support request:</p>
        <p><strong>${subject}</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
        <p>Our team will get back to you shortly.</p>
      `,
    });

    if (confirmationEmail.error) {
      console.error(
        "[support] Error sending confirmation:",
        confirmationEmail.error,
      );
      return NextResponse.json(
        { error: "Error lors de l'envoi de l'email de confirmation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
