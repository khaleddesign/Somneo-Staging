-- ============================================================
-- STORAGE POLICIES - SOMNOCONNECT
-- ============================================================

-- Bucket: study-files (fichiers ZIP des études)
DROP POLICY IF EXISTS "study_files_select" ON storage.objects;
DROP POLICY IF EXISTS "study_files_insert" ON storage.objects;

CREATE POLICY "study_files_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'study-files'
    AND (
      -- Client propriétaire
      (public.is_client() AND (storage.foldername(name))[1] = auth.uid()::text)
      OR
      -- Agent assigné (vérifier via la table studies)
      (public.is_agent() AND EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.file_path LIKE '%' || name || '%'
        AND s.assigned_agent_id = auth.uid()
      ))
      OR
      -- Admin de l'institution
      public.is_admin()
    )
  );

CREATE POLICY "study_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'study-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket: reports-files (rapports PDF)
DROP POLICY IF EXISTS "reports_files_select" ON storage.objects;
DROP POLICY IF EXISTS "reports_files_insert" ON storage.objects;

CREATE POLICY "reports_files_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports-files'
    AND (
      -- Vérifier l'accès via la table studies
      EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.report_path LIKE '%' || name || '%'
        AND (
          (public.is_client() AND s.client_id = auth.uid())
          OR (public.is_agent() AND s.assigned_agent_id = auth.uid())
          OR public.is_admin()
        )
      )
    )
  );

CREATE POLICY "reports_files_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports-files'
    AND (
      public.is_agent() OR public.is_admin()
    )
  );
