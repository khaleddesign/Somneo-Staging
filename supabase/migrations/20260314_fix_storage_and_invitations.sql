-- ============================================================
-- FIX 1: Storage report upload policy - validate specific study
-- Bug: agent assigned to ANY study could upload to ANY report path
-- Fix: enforce that the study_id encoded in the file path belongs
--      to a study actually assigned to this agent
-- ============================================================

DROP POLICY IF EXISTS "reports_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "reports_files_update_policy" ON storage.objects;

-- INSERT: agent can only upload to path starting with a study_id assigned to them
-- Expected path format: {study_id}/{filename}
CREATE POLICY "reports_files_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.assigned_agent_id = auth.uid()
          AND (storage.foldername(name))[1] = s.id::text
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- UPDATE: same constraint for replacements
CREATE POLICY "reports_files_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reports-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.studies s
        WHERE s.assigned_agent_id = auth.uid()
          AND (storage.foldername(name))[1] = s.id::text
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- ============================================================
-- FIX 2: Invitations - prevent orphan records when creator is deleted
-- ============================================================

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_created_by_fkey;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
