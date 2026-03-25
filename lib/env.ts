/**
 * Environment variable validation.
 *
 * Call validateEnv() at app startup (e.g., in instrumentation.ts or a server
 * utility) to catch missing variables early rather than at runtime.
 *
 * In production: throws if any required variable is absent.
 * In development/test: warns to console but continues.
 */

const REQUIRED: readonly string[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
];

export interface ValidatedEnv {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENCRYPTION_KEY: string;
  [key: string]: string | undefined;
}

export function validateEnv(): ValidatedEnv {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(`[env] ${message}`);
    }
  }

  return process.env as unknown as ValidatedEnv;
}

/**
 * Read a single env var with an optional fallback.
 */
export function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}
