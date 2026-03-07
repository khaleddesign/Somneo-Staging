import { z } from 'zod'

/** Supprime toutes les balises HTML pour prévenir le XSS stocké */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

/** Champ texte sanitisé : longueur max + strip HTML */
function safeText(max: number) {
  return z.string().max(max).transform(stripHtml)
}

export const emailSchema = z
  .string()
  .email('Email invalide')
  .max(254)
  .transform((s) => s.trim().toLowerCase())

export const uuidSchema = z.string().uuid('Identifiant invalide')

// ── Schémas métier ───────────────────────────────────────────────

export const commentSchema = z.object({
  study_id: uuidSchema,
  message: safeText(2000).refine((s) => s.length > 0, { message: 'Message vide' }),
})

export const studySchema = z.object({
  patient_reference: safeText(100).refine((s) => s.length > 0, {
    message: 'Référence patient requise',
  }),
  study_type: z.enum(['PSG', 'PV']),
  priority: z.enum(['low', 'medium', 'high']),
  notes: safeText(5000).optional(),
})

export const inviteSchema = z.object({
  email: emailSchema,
  full_name: safeText(100).nullish(),
  role: z.enum(['admin', 'agent', 'client']).optional().default('client'),
})
