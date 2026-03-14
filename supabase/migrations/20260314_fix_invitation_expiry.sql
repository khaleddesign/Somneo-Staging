-- ============================================================
-- FIX: Harmonisation expiration invitations à 24 heures
-- Corrige l'incohérence: migration précédente utilisait 7 jours,
-- le code TypeScript utilise 24 heures.
-- Règle : 24 heures (conformité RGPD / bonne pratique sécurité)
-- ============================================================

ALTER TABLE public.invitations
  ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '24 hours';

-- Mettre à jour les invitations existantes non utilisées qui ont encore l'ancienne valeur 7 jours
-- (Ne touche pas aux invitations déjà utilisées)
UPDATE public.invitations
SET expires_at = created_at + INTERVAL '24 hours'
WHERE used_at IS NULL
  AND expires_at > NOW() + INTERVAL '24 hours';
