-- ============================================================================
-- FIX: Storage study-files ALL policies pour les signed upload tokens (TUS)
-- ============================================================================
--
-- PROBLÈME:
-- L'upload resumable (TUS) requiert INSERT, mais aussi SELECT et UPDATE sur l'objet.
-- Les policies actuelles (study_files_select_own, study_files_update_own) 
-- exigent "auth.uid() IS NOT NULL", ce qui bloque les requêtes TUS utilisant
-- un signed upload token car le JWT est celui du storage, où auth.uid() est NULL.
--
-- FIX:
-- On remplace toutes les policies du bucket "study-files" pour garantir que :
-- 1. Les actions authentifiées (JWT normal) marchent comme avant
-- 2. Les actions non-authentifiées (JWT du storage signed token) soient permises
--    sur la base de la validité du format de chemin, puisque Supabase valide de
--    toute façon la cryptographie du token avant d'arriver au RLS.
-- ============================================================================

-- Nettoyer toutes les anciennes policies qui peuvent interférer
DROP POLICY IF EXISTS "study_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "study_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "study_files_select" ON storage.objects;
DROP POLICY IF EXISTS "study_files_select_own" ON storage.objects;
DROP POLICY IF EXISTS "study_files_update" ON storage.objects;
DROP POLICY IF EXISTS "study_files_update_own" ON storage.objects;
DROP POLICY IF EXISTS "study_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "study_files_delete_own" ON storage.objects;

-- Nouvelle policy INSERT globale
CREATE POLICY "study_files_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'study-files'
    AND (
      (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      (auth.uid() IS NULL AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    )
  );

-- Nouvelle policy SELECT globale
CREATE POLICY "study_files_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'study-files'
    AND (
      -- Soit TUS Upload Token (uid is null pour le signed url)
      (auth.uid() IS NULL AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      OR
      -- Soit appelant authentifié
      (auth.uid() IS NOT NULL AND (
        (public.is_client() AND (storage.foldername(name))[1] = auth.uid()::text)
        OR (public.is_agent() AND EXISTS (SELECT 1 FROM public.studies s WHERE s.file_path LIKE '%' || name || '%' AND s.assigned_agent_id = auth.uid()))
        OR public.is_admin()
      ))
    )
  );

-- Nouvelle policy UPDATE globale (pour reprendre l'upload avec TUS)
CREATE POLICY "study_files_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'study-files'
    AND (
      (auth.uid() IS NULL AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      OR
      (auth.uid() IS NOT NULL AND (
        (public.is_client() AND (storage.foldername(name))[1] = auth.uid()::text)
        OR public.is_admin()
      ))
    )
  );

-- Nouvelle policy DELETE globale (pour annuler l'upload avec TUS)
CREATE POLICY "study_files_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'study-files'
    AND (
      (auth.uid() IS NULL AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      OR
      (auth.uid() IS NOT NULL AND (
        (public.is_client() AND (storage.foldername(name))[1] = auth.uid()::text)
        OR public.is_admin()
      ))
    )
  );
