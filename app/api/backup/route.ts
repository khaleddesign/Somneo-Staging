import { NextResponse } from "next/server";

// Thin Vercel cron trigger (max 10s on Hobby plan).
// Actual backup logic runs in the Supabase Edge Function "backup-r2"
// which resumes from a DB checkpoint on each call.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 },
    );
  }

  const edgeFnUrl = `${supabaseUrl}/functions/v1/backup-r2`;

  // Abort after 8s so Vercel doesn't timeout — Edge Function continues on Supabase.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(edgeFnUrl, {
      method: "POST",
      headers: {
        // Service role key passes Supabase's gateway layer
        Authorization: `Bearer ${serviceRoleKey}`,
        // Custom header carries CRON_SECRET for the function's own auth check
        "x-cron-secret": cronSecret,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ triggered: true, status: res.status, ...body });
  } catch {
    clearTimeout(timeout);
    // Timeout reached — Edge Function is still running on Supabase
    return NextResponse.json({ triggered: true, note: "running in background" });
  }
}
