import { z } from "zod";

/** Supprime toutes les balises HTML pour prévenir le XSS stocké */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

/** Champ texte sanitisé : longueur max + strip HTML */
function safeText(max: number) {
  return z.string().max(max).transform(stripHtml);
}

export const emailSchema = z
  .string()
  .email("Invalid email")
  .max(254)
  .transform((s) => s.trim().toLowerCase());

export const uuidSchema = z.string().uuid("Invalid identifier");

// ── Schémas métier ───────────────────────────────────────────────

export const commentSchema = z.object({
  study_id: uuidSchema,
  message: safeText(2000).refine((s) => s.length > 0, {
    message: "Message cannot be empty",
  }),
});

export const studySchema = z.object({
  patient_reference: safeText(100).refine((s) => s.length > 0, {
    message: "Patient reference is required",
  }),
  study_type: z.enum(["PSG", "PV"]),
  priority: z.enum(["low", "medium", "high"]),
  notes: safeText(5000).optional(),
  client_id: uuidSchema.optional(), // Optionnel car injecté pour les clients
});

export const updateStudySchema = z.object({
  patient_reference: safeText(100).optional(),
  study_type: z.enum(["PSG", "PV"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  notes: safeText(5000).optional(),
  status: z.enum(["en_attente", "en_cours", "termine", "annule"]).optional(),
});

export const inviteSchema = z.object({
  email: emailSchema,
  full_name: safeText(100).nullish(),
  role: z.enum(["admin", "agent", "client"]).optional().default("client"),
  institution_id: uuidSchema.optional(),
});

export const updateProfileSchema = z.object({
  id: uuidSchema,
  full_name: safeText(100).optional(),
  email: emailSchema.optional(),
  is_suspended: z.boolean().optional(),
  institution_id: uuidSchema.optional(),
});

export const invoiceSchema = z.object({
  clientId: uuidSchema,
  mode: z.enum(["manual", "monthly"]),
  billingMonth: z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM requis").optional(),
  studyIds: z.array(uuidSchema).optional(),
});
