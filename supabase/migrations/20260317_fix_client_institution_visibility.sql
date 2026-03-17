-- ============================================================================
-- FIX CLIENT INSTITUTION VISIBILITY
-- Date: 2026-03-17
-- Problème : la RLS studies_select_policy n'autorisait un client qu'à voir ses
--            propres études (client_id = auth.uid()). La migration
--            20260316_institution_visibility.sql avait créé la fonction
--            get_my_institution_client_ids() mais n'avait pas mis à jour la
--            policy RLS, donc les clients de la même institution ne pouvaient
--            pas se voir les études des autres clients.
--
-- Fix : on étend la condition client pour inclure les études de tous les
--       clients de la même institution (via get_my_institution_client_ids()).
-- ============================================================================

-- Supprimer l'ancienne policy
DROP POLICY IF EXISTS "studies_select_policy" ON public.studies;

-- Recréer avec la condition institution pour les clients
CREATE POLICY "studies_select_policy" ON public.studies
  FOR SELECT USING (
    -- Client voit ses propres études ET les études de son institution
    (public.is_client() AND (
      client_id = auth.uid()
      OR client_id IN (SELECT public.get_my_institution_client_ids())
    ))
    OR
    -- Agent voit les études qui lui sont assignées OU non assignées de son institution
    (public.is_agent() AND (
      assigned_agent_id = auth.uid()
      OR (
        assigned_agent_id IS NULL
        AND client_id IN (
          SELECT id FROM public.profiles
          WHERE institution_id = public.get_my_institution_id()
        )
      )
    ))
    OR
    -- Admin voit toutes les études de son institution
    (public.is_admin() AND client_id IN (
      SELECT id FROM public.profiles
      WHERE institution_id = public.get_my_institution_id()
    ))
  );

-- S'assurer que la fonction get_my_institution_client_ids est bien accessible
GRANT EXECUTE ON FUNCTION public.get_my_institution_client_ids() TO authenticated;
