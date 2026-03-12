-- ============================================================================
-- SOMNOCONNECT SECURITY HARDENING MIGRATION
-- Fixes for Privilege Escalation, IDOR, Storage Access, Token Exposure
-- ============================================================================

-- ============================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Récupérer l'institution de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_my_institution_id()
RETURNS UUID AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Vérifier si l'utilisateur peut accéder à une étude
CREATE OR REPLACE FUNCTION can_access_study(study_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM studies s
    JOIN profiles p ON p.id = auth.uid()
    JOIN profiles client_profile ON client_profile.id = s.client_id
    WHERE s.id = study_id
    AND client_profile.institution_id = p.institution_id  -- Même institution obligatoirement
    AND (
      p.role = 'admin'  -- Admin voit tout de son institution
      OR s.client_id = auth.uid()  -- Client propriétaire
      OR s.assigned_agent_id = auth.uid()  -- Agent assigné
      OR (p.role = 'agent' AND s.assigned_agent_id IS NULL)  -- Agent voit les non-assignées
    )
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ============================================
-- 2. FUNCTON SÉCURISÉE: CHANGEMENT DE RÔLE (FAILLE 1)
-- ============================================

CREATE OR REPLACE FUNCTION change_user_role(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  caller_role TEXT;
  caller_inst UUID;
  target_inst UUID;
BEGIN
  -- 1. Vérifier si l'appelant est admin
  SELECT role, institution_id INTO caller_role, caller_inst 
  FROM profiles WHERE id = auth.uid();
  
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Only admins can change roles.';
  END IF;

  -- 2. Empêcher l'auto-modification
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own role.';
  END IF;

  -- 3. Vérifier même institution
  SELECT institution_id INTO target_inst FROM profiles WHERE id = target_user_id;
  IF target_inst != caller_inst THEN
    RAISE EXCEPTION 'Access denied. Target user is in a different institution.';
  END IF;

  -- 4. Audit Log
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'change_role', 'profile', target_user_id, jsonb_build_object('new_role', new_role));

  -- 5. Exécuter
  UPDATE profiles SET role = new_role, updated_at = now() WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 3. HARDENING RLS: PROFILES (FAILLE 1 & 2)
-- ============================================

-- RLS: select
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    auth.uid() = id -- Voir son propre profil
    OR (
        is_admin() 
        AND institution_id = get_my_institution_id() -- Admins voient leur institution
    )
  );

-- RLS: update (déjà partiellement durci, on le rend étanche)
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (
    -- Admin modifie ceux de son institution
    (is_admin() AND institution_id = get_my_institution_id())
    OR 
    -- User modifie son propre profil
    (
      auth.uid() = id 
      AND role = get_my_role() -- Protection stricte: rôle inchangé
      AND institution_id = get_my_institution_id() -- Institution inchangée
    )
  );


-- ============================================
-- 4. HARDENING RLS: STUDIES (FAILLE 3)
-- ============================================

DROP POLICY IF EXISTS "studies_select" ON studies;
CREATE POLICY "studies_select" ON studies FOR SELECT
  USING (
    -- Appliquer la fonction sécurisée unifiée
    can_access_study(id)
  );

DROP POLICY IF EXISTS studies_update ON studies;
CREATE POLICY studies_update ON studies FOR UPDATE
  USING (can_access_study(id))
  WITH CHECK (
    -- Admin ou Agent (assigné / non assigné)
    (is_admin() OR is_agent()) AND can_access_study(id)
  );


-- ============================================
-- 5. HARDENING RLS: REPORTS (FAILLE 3)
-- ============================================

DROP POLICY IF EXISTS "agents manage reports" ON study_reports;
DROP POLICY IF EXISTS "clients read reports" ON study_reports;

-- RLS unique consolidée
CREATE POLICY "study_reports_access" ON study_reports
  FOR ALL TO authenticated
  USING (can_access_study(study_id))
  WITH CHECK (
    -- Seul agent/admin peut modifer
    can_access_study(study_id) AND (is_agent() OR is_admin())
  );


-- ============================================
-- 6. HARDENING RLS: INVITATIONS (FAILLE 5 & 6)
-- ============================================

-- Ajouter l'expiration (Faille 6)
ALTER TABLE invitations ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Restreindre accès (Faille 5)
DROP POLICY IF EXISTS "invitations_all" ON invitations;

CREATE POLICY "admin_all_invitations" ON invitations
  FOR ALL
  USING (is_admin() AND institution_id = get_my_institution_id())
  WITH CHECK (is_admin() AND institution_id = get_my_institution_id());

-- Vue sécurisée sans le token pour l'affichage UI si besoin
CREATE OR REPLACE VIEW safe_invitations AS 
SELECT id, email, role_invited, created_by, institution_id, expires_at, used_at, created_at 
FROM invitations;


-- ============================================
-- 7. HARDENING RLS: STORAGE BUCKETS (FAILLE 4)
-- ============================================

-- Supprimer les policies vulnérables
DROP POLICY IF EXISTS "agents_read_study_files" ON storage.objects;
DROP POLICY IF EXISTS "clients_read_own_reports" ON storage.objects;

-- study-files : Lecture uniquement si accès à l'étude (et on sait qu'on parse l'ID de l'étude dans le nom du fichier id_patientRef.ext ou similaire.
-- Si ID du folder = id d'étude :
CREATE POLICY "secured_read_study_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'study-files' 
    AND (
      -- Extract study_id from path (assuming path is study_id/filename)
      -- or just fallback to role based if path isn't strictly study_id
      -- Here we assume path starts with study_id
      can_access_study( (string_to_array(name, '/'))[1]::uuid )
    )
  );

-- report-files : Idem
CREATE POLICY "secured_read_report_files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'report-files'
    AND (
       can_access_study( (string_to_array(name, '/'))[1]::uuid )
    )
  );

-- ============================================
-- 8. INSTITUTIONS, COMMENTS & NOTIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "institutions_select" ON institutions;
CREATE POLICY "institutions_select" ON institutions FOR SELECT
  USING (id = get_my_institution_id() OR is_admin());

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (can_access_study(study_id));
  
DROP POLICY IF EXISTS "history_select" ON study_history;
CREATE POLICY "history_select" ON study_history FOR SELECT
  USING (can_access_study(study_id));
