-- ============================================================================
-- HARDEN SECURITY DEFINER FUNCTIONS (Search Path Mutable Fix)
-- Date: 2026-03-18
-- ============================================================================

-- On utilise CASCADE car can_access_study est utilisée dans des RLS policies
DROP FUNCTION IF EXISTS public.can_access_study(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.change_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_my_institution_client_ids() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_institution() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_institution_id() CASCADE;

-- 1. can_access_study
CREATE OR REPLACE FUNCTION public.can_access_study(study_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studies s
    JOIN public.profiles p ON p.id = auth.uid()
    JOIN public.profiles client_profile ON client_profile.id = s.client_id
    WHERE s.id = study_id
    AND client_profile.institution_id = p.institution_id
    AND (
      p.role = 'admin'
      OR s.client_id = auth.uid()
      OR s.assigned_agent_id = auth.uid()
      OR (p.role = 'agent' AND s.assigned_agent_id IS NULL)
      OR (p.role = 'client' AND client_profile.institution_id = p.institution_id)
    )
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- 2. get_my_institution_client_ids
CREATE OR REPLACE FUNCTION public.get_my_institution_client_ids()
RETURNS SETOF uuid AS $$
  SELECT id FROM public.profiles
  WHERE institution_id = (
    SELECT institution_id FROM public.profiles WHERE id = auth.uid()
  )
    AND role = 'client'
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- 3. log_study_deletion
-- Pas de CASCADE nécessaire normalement car c'est un trigger interne
CREATE OR REPLACE FUNCTION public.log_study_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    old_data,
    performed_by
  )
  VALUES (
    'DELETE',
    'studies',
    OLD.id,
    to_jsonb(OLD),
    auth.uid()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 4. change_user_role
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  caller_institution UUID;
  target_institution UUID;
  old_role TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  SELECT role, institution_id INTO caller_role, caller_institution
  FROM public.profiles WHERE id = caller_id;
  
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permission refusée : seul un admin peut modifier les rôles';
  END IF;
  
  IF target_user_id = caller_id THEN
    RAISE EXCEPTION 'Impossible de modifier votre propre rôle';
  END IF;
  
  SELECT role, institution_id INTO old_role, target_institution
  FROM public.profiles WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible non trouvé';
  END IF;
  
  IF target_institution != caller_institution THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur dans une autre institution';
  END IF;
  
  IF new_role NOT IN ('admin', 'agent', 'client') THEN
    RAISE EXCEPTION 'Rôle invalide : doit être admin, agent ou client';
  END IF;
  
  UPDATE public.profiles SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;
  
  INSERT INTO public.audit_log (action, table_name, record_id, old_data, new_data, performed_by)
  VALUES (
    'ROLE_CHANGE',
    'profiles',
    target_user_id,
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role),
    caller_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_role', old_role,
    'new_role', new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 5. get_my_institution
CREATE OR REPLACE FUNCTION public.get_my_institution()
RETURNS UUID AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- 6. get_my_institution_id
CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public;

-- ============================================================================
-- RECRÉATION DES POLICIES SUPPRIMÉES PAR LE CASCADE
-- ============================================================================

-- Sur public.studies
DROP POLICY IF EXISTS "studies_select" ON public.studies;
CREATE POLICY "studies_select" ON public.studies FOR SELECT
  USING (public.can_access_study(id));

DROP POLICY IF EXISTS "studies_update" ON public.studies;
CREATE POLICY "studies_update" ON public.studies FOR UPDATE
  USING (public.can_access_study(id))
  WITH CHECK ((public.is_admin() OR public.is_agent()) AND public.can_access_study(id));

-- Sur public.study_reports
DROP POLICY IF EXISTS "study_reports_access" ON public.study_reports;
CREATE POLICY "study_reports_access" ON public.study_reports
  FOR ALL TO authenticated
  USING (public.can_access_study(study_id))
  WITH CHECK (public.can_access_study(study_id) AND (public.is_agent() OR public.is_admin()));

-- Sur public.comments
DROP POLICY IF EXISTS "comments_select" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT
  USING (public.can_access_study(study_id));

-- Sur public.study_history
DROP POLICY IF EXISTS "history_select" ON public.study_history;
CREATE POLICY "history_select" ON public.study_history FOR SELECT
  USING (public.can_access_study(study_id));

-- Sur storage.objects (reports-files)
DROP POLICY IF EXISTS "secured_read_reports_files_new" ON storage.objects;
CREATE POLICY "secured_read_reports_files_new" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reports-files' AND public.can_access_study((string_to_array(name, '/'))[1]::uuid));

-- Rétablir les GRANTS
GRANT EXECUTE ON FUNCTION public.can_access_study(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_institution_client_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_institution() TO authenticated;
