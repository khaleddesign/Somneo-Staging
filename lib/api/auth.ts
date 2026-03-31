import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ZodSchema } from "zod";

export type UserRole = "admin" | "agent" | "client";

export interface AuthContext<T = any> {
  user: any;
  profile: {
    id: string;
    role: UserRole;
    institution_id: string | null;
    full_name: string | null;
    is_suspended: boolean;
  };
  adminClient: ReturnType<typeof createAdminClient>;
  params: any;
  validatedData?: T; // Inject validated data if schema is provided
}

/**
 * Handler type for authenticated routes.
 */
export type AuthenticatedHandler<T = any> = (
  req: any,
  context: AuthContext<T>,
) => Promise<NextResponse> | NextResponse;

export interface RequireAuthOptions<T = any> {
  schema?: ZodSchema<T>;
}

/**
 * Middleware-like wrapper to enforce authentication, role-based access,
 * and optional Zod validation.
 *
 * @param allowedRoles - Array of roles permitted to access the route
 * @param optionsOrHandler - Either an options object with a schema or the handler itself
 * @param maybeHandler - The handler if options were provided as the second argument
 */
export function requireAuth<T = any>(
  allowedRoles: UserRole[],
  optionsOrHandler: RequireAuthOptions<T> | AuthenticatedHandler<T>,
  maybeHandler?: AuthenticatedHandler<T>,
) {
  const options = typeof optionsOrHandler === "object" ? optionsOrHandler : {};
  const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler!;

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

    let validatedData: T | undefined;
    if (options.schema) {
      try {
        const body = await req.json();
        const result = options.schema.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error.issues[0]?.message ?? "Invalid data" },
            { status: 400 },
          );
        }
        validatedData = result.data;
      } catch (e) {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 },
        );
      }
    }

    // Inject context, params, and validatedData into the handler
    return handler(req, {
      user,
      profile: profile as AuthContext["profile"],
      adminClient,
      params: context?.params || {},
      validatedData,
    });
  };
}
