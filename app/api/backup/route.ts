import { NextResponse } from "next/server";

// This route is a thin Vercel cron trigger (max 10s on Hobby plan).
// The actual backup logic runs in the Supabase Edge Function "backup-r2"
// which supports up to 150s and resumes from a checkpoint on each call.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/backup-r2`;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  // Abort the fetch after 8s so Vercel doesn't timeout, but the Edge Function
  // continues running on Supabase infrastructure until its own 150s limit.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ triggered: true, ...body });
  } catch {
    clearTimeout(timeout);
    // Timeout reached — Edge Function is still running on Supabase
    return NextResponse.json({ triggered: true, note: "running in background" });
  }
}
