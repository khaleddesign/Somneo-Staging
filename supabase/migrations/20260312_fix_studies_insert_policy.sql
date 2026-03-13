-- ============================================================
-- FIX : Permettre aux agents de créer des études pour leurs clients
-- Date: 2026-03-12
-- Bug: studies_insert_policy bloquait les agents (auth.uid() = client_id)
-- ============================================================

-- Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "studies_insert_policy" ON public.studies;

-- Nouvelle policy INSERT :
-- - Client peut créer une étude pour lui-même
-- - Agent peut créer une étude pour un client de la MÊME institution
CREATE POLICY "studies_insert_policy" ON public.studies
  FOR INSERT WITH CHECK (
    -- Client crée pour lui-même
    (public.is_client() AND auth.uid() = client_id)
    OR
    -- Agent crée pour un client de son institution
    (public.is_agent() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = client_id
        AND p.role = 'client'
        AND p.institution_id = public.get_my_institution_id()
    ))
    OR
    -- Admin peut créer pour n'importe quel client de son institution
    (public.is_admin() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = client_id
        AND p.institution_id = public.get_my_institution_id()
    ))
  );
