import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserRole = "admin" | "agent" | "client";

export interface AuthContext {
  user: any;
  profile: {
    id: string;
    role: UserRole;
    institution_id: string | null;
    full_name: string | null;
    is_suspended: boolean;
  };
  adminClient: ReturnType<typeof createAdminClient>;
  params: any; // Inject route params here
}

/**
 * Handler type for authenticated routes.
 * Accepts both standard Request and Next.js NextRequest.
 */
export type AuthenticatedHandler = (
  req: any,
  context: AuthContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Middleware-like wrapper to enforce authentication and role-based access.
 *
 * @param allowedRoles - Array of roles permitted to access the route
 * @param handler - The actual API logic to execute if authorized
 */
export function requireAuth(
  allowedRoles: UserRole[],
  handler: AuthenticatedHandler,
) {
  return async (req: Request | NextRequest, context: { params: any }): Promise<NextResponse> => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, institution_id, full_name, is_suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    if (profile.is_suspended) {
      return NextResponse.json(
        { error: "Account suspended. Please contact support." },
        { status: 403 },
      );
    }

    if (!allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json(
        { error: `Access denied: ${profile.role} role not permitted` },
        { status: 403 },
      );
    }

    // Inject context AND params into the handler
    return handler(req, {
      user,
      profile: profile as AuthContext["profile"],
      adminClient,
      params: context?.params || {},
    });
  };
}
