-- ============================================================
-- FIX : Permettre à l'agent assigné d'uploader des rapports
-- ============================================================

-- Supprimer les anciennes policies d'insertion
DROP POLICY IF EXISTS "reports_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "reports_files_insert_policy" ON storage.objects;

-- Nouvelle policy INSERT pour reports-files
CREATE POLICY "reports_files_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports-files'
    AND (
      -- Agent peut uploader sur les études qui lui sont assignées
      EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.assigned_agent_id = auth.uid()
      )
      OR
      -- Admin peut uploader
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- S'assurer que la policy UPDATE existe aussi (pour remplacer un fichier)
DROP POLICY IF EXISTS "reports_files_update_policy" ON storage.objects;

CREATE POLICY "reports_files_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reports-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.assigned_agent_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );