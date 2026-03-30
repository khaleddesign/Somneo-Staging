import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PricingUpdateItem {
  study_type: "PSG" | "PV" | "MSLT" | "MWT" | string;
  price_ht: number;
}

interface PricingUpdateBody {
  prices?: PricingUpdateItem[];
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    };
  }

  return { admin };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const { admin } = auth;
    const { data, error } = await admin
      .from("invoice_settings")
      .select("*")
      .order("study_type", { ascending: true });

    if (error) {
      console.error("[invoices/settings] DB Error:", error);
      return NextResponse.json(
        { error: "Error retrieving settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: data ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as PricingUpdateBody;
    const updates = Array.isArray(body.prices) ? body.prices : [];

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No update provided" },
        { status: 400 },
      );
    }

    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const upsertData = updates
      .filter((item) => item.study_type && !Number.isNaN(Number(item.price_ht)))
      .map((item) => ({
        study_type: item.study_type,
        price_ht: Number(item.price_ht),
        updated_at: new Date().toISOString(),
      }));

    if (upsertData.length > 0) {
      const { error } = await admin
        .from("invoice_settings")
        .upsert(upsertData, { onConflict: "study_type" });

      if (error) {
        console.error("[invoices/settings] Upsert Error:", error);
        return NextResponse.json(
          { error: "Error updating settings" },
          { status: 500 },
        );
      }
    }

    const { data: refreshed, error: refreshError } = await admin
      .from("invoice_settings")
      .select("*")
      .order("study_type", { ascending: true });

    if (refreshError) {
      return NextResponse.json(
        { error: refreshError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ settings: refreshed ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
