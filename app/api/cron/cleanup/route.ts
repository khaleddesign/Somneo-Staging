import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// FILE DELETION DISABLED — waiting for R2 backup confirmation.
// Re-enable once backup-r2 Edge Function is verified working.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ disabled: true, reason: "Pending R2 backup verification" });
}
