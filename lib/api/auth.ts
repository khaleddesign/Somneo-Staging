import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { User } from "@supabase/supabase-js";

// Définition des rôles possibles
export type UserRole = "admin" | "agent" | "client";

// Interface pour le profil utilisateur étendu
export interface AuthenticatedProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  is_suspended: boolean;
  institution_id: string | null;
}

// Interface pour le contexte d'authentification passé au handler
export interface AuthContext {
  user: User;
  profile: AuthenticatedProfile;
  adminClient: ReturnType<typeof createAdminClient>;
}

// Type pour le handler d'API après authentification
export type AuthenticatedApiHandler = (
  req: NextRequest,
  context: AuthContext,
) => Promise<NextResponse>;

/**
 * Higher-Order Function (HOF) pour sécuriser les routes API.
 * Vérifie l'authentification de l'utilisateur et son rôle.
 * Doit être utilisé conjointement avec `withErrorHandler`.
 *
 * @param allowedRoles - Tableau des rôles autorisés pour accéder à cette route.
 * @param handler - La fonction de gestionnaire d'API à exécuter si l'authentification et le rôle sont valides.
 * @returns Une fonction Next.js API Route Handler.
 */
export const requireAuth = (
  allowedRoles: UserRole[],
  handler: AuthenticatedApiHandler,
) => {
  return async (req: NextRequest) => {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role, is_suspended, institution_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[requireAuth] Profile fetch error:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.is_suspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Passer l'utilisateur, le profil et le client admin au handler
    return handler(req, { user, profile, adminClient });
  };
};
