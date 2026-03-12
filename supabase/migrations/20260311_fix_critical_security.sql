-- ============================================================
-- MIGRATION DE SÉCURITÉ CRITIQUE - SOMNOCONNECT
-- Date: 2026-03-11
-- Corrige: Privilege Escalation, IDOR, Token Exposure
-- ============================================================

-- ============================================================
-- PARTIE 1 : FONCTIONS HELPER SÉCURISÉES
-- ============================================================

-- Fonction pour récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Fonction pour récupérer l'institution de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_my_institution_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
$$;

-- Fonction pour vérifier si l'utilisateur est agent
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'agent'
  )
$$;

-- Fonction pour vérifier si l'utilisateur est client
CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'client'
  )
$$;

-- ============================================================
-- PARTIE 2 : TABLE D'AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent lire les logs
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- Tout le monde peut insérer (pour le logging)
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- PARTIE 3 : FONCTION SÉCURISÉE POUR CHANGEMENT DE RÔLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  caller_role TEXT;
  caller_institution UUID;
  target_institution UUID;
  old_role TEXT;
BEGIN
  -- Récupérer l'ID de l'appelant
  caller_id := auth.uid();
  
  -- Vérifier que l'appelant est authentifié
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Récupérer le rôle et institution de l'appelant
  SELECT role, institution_id INTO caller_role, caller_institution
  FROM public.profiles WHERE id = caller_id;
  
  -- Vérifier que l'appelant est admin
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permission refusée : seul un admin peut modifier les rôles';
  END IF;
  
  -- Empêcher de modifier son propre rôle
  IF target_user_id = caller_id THEN
    RAISE EXCEPTION 'Impossible de modifier votre propre rôle';
  END IF;
  
  -- Vérifier que la cible existe et récupérer son institution
  SELECT role, institution_id INTO old_role, target_institution
  FROM public.profiles WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible non trouvé';
  END IF;
  
  -- Vérifier que la cible est dans la même institution
  IF target_institution != caller_institution THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur dans une autre institution';
  END IF;
  
  -- Valider le nouveau rôle
  IF new_role NOT IN ('admin', 'agent', 'client') THEN
    RAISE EXCEPTION 'Rôle invalide : doit être admin, agent ou client';
  END IF;
  
  -- Effectuer la modification
  UPDATE public.profiles SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Logger l'action
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
$$;

-- ============================================================
-- PARTIE 4 : RLS TABLE PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- SELECT : Un user voit son propre profil, admin voit son institution
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id  -- Voir son propre profil
    OR (
      -- Admin voit tous les profils de son institution
      public.is_admin() 
      AND institution_id = public.get_my_institution_id()
    )
  );

-- UPDATE : Un user peut modifier son profil SAUF le champ role
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  ) WITH CHECK (
    auth.uid() = id
    -- Le rôle ne peut PAS être modifié via UPDATE direct
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- INSERT : Géré par trigger d'inscription uniquement
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- ============================================================
-- PARTIE 5 : RLS TABLE STUDIES
-- ============================================================

ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "studies_select" ON public.studies;
DROP POLICY IF EXISTS "studies_select_policy" ON public.studies;
DROP POLICY IF EXISTS "studies_update" ON public.studies;
DROP POLICY IF EXISTS "studies_update_policy" ON public.studies;
DROP POLICY IF EXISTS "studies_insert" ON public.studies;
DROP POLICY IF EXISTS "studies_insert_policy" ON public.studies;
DROP POLICY IF EXISTS "studies_delete" ON public.studies;
DROP POLICY IF EXISTS "studies_delete_policy" ON public.studies;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.studies;

-- SELECT : Basé sur le rôle
CREATE POLICY "studies_select_policy" ON public.studies
  FOR SELECT USING (
    -- Client voit ses propres études
    (public.is_client() AND client_id = auth.uid())
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

-- UPDATE : Agent assigné ou admin
CREATE POLICY "studies_update_policy" ON public.studies
  FOR UPDATE USING (
    -- Agent assigné peut modifier
    (public.is_agent() AND assigned_agent_id = auth.uid())
    OR
    -- Admin peut modifier les études de son institution
    (public.is_admin() AND client_id IN (
      SELECT id FROM public.profiles 
      WHERE institution_id = public.get_my_institution_id()
    ))
  );

-- INSERT : Client peut créer une étude pour lui-même
CREATE POLICY "studies_insert_policy" ON public.studies
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
  );

-- DELETE : Admin seulement
CREATE POLICY "studies_delete_policy" ON public.studies
  FOR DELETE USING (
    public.is_admin() AND client_id IN (
      SELECT id FROM public.profiles 
      WHERE institution_id = public.get_my_institution_id()
    )
  );

-- ============================================================
-- PARTIE 6 : RLS TABLE STUDY_REPORTS
-- ============================================================

ALTER TABLE public.study_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_reports_select" ON public.study_reports;
DROP POLICY IF EXISTS "study_reports_select_policy" ON public.study_reports;
DROP POLICY IF EXISTS "study_reports_insert_policy" ON public.study_reports;
DROP POLICY IF EXISTS "study_reports_update_policy" ON public.study_reports;

-- SELECT : Mêmes règles que studies
CREATE POLICY "study_reports_select_policy" ON public.study_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_reports.study_id
      AND (
        -- Client propriétaire
        (public.is_client() AND s.client_id = auth.uid())
        OR
        -- Agent assigné
        (public.is_agent() AND s.assigned_agent_id = auth.uid())
        OR
        -- Admin de l'institution
        (public.is_admin() AND s.client_id IN (
          SELECT id FROM public.profiles 
          WHERE institution_id = public.get_my_institution_id()
        ))
      )
    )
  );

-- INSERT : Agent assigné ou admin
CREATE POLICY "study_reports_insert_policy" ON public.study_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_id
      AND (
        (public.is_agent() AND s.assigned_agent_id = auth.uid())
        OR
        (public.is_admin() AND s.client_id IN (
          SELECT id FROM public.profiles 
          WHERE institution_id = public.get_my_institution_id()
        ))
      )
    )
  );

-- UPDATE : Agent assigné ou admin
CREATE POLICY "study_reports_update_policy" ON public.study_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_reports.study_id
      AND (
        (public.is_agent() AND s.assigned_agent_id = auth.uid())
        OR
        (public.is_admin() AND s.client_id IN (
          SELECT id FROM public.profiles 
          WHERE institution_id = public.get_my_institution_id()
        ))
      )
    )
  );

-- ============================================================
-- PARTIE 7 : RLS TABLE INVITATIONS
-- ============================================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitations_select" ON public.invitations;
DROP POLICY IF EXISTS "invitations_select_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.invitations;
DROP POLICY IF EXISTS "invitations_insert_policy" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete" ON public.invitations;
DROP POLICY IF EXISTS "invitations_delete_policy" ON public.invitations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.invitations;

-- SELECT : ADMIN SEULEMENT
CREATE POLICY "invitations_select_policy" ON public.invitations
  FOR SELECT USING (
    public.is_admin() 
    AND institution_id = public.get_my_institution_id()
  );

-- INSERT : Admin seulement
CREATE POLICY "invitations_insert_policy" ON public.invitations
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND institution_id = public.get_my_institution_id()
    AND created_by = auth.uid()
  );

-- UPDATE : Admin seulement (pour marquer comme utilisée)
CREATE POLICY "invitations_update_policy" ON public.invitations
  FOR UPDATE USING (
    public.is_admin()
    AND institution_id = public.get_my_institution_id()
  );

-- DELETE : Admin seulement
CREATE POLICY "invitations_delete_policy" ON public.invitations
  FOR DELETE USING (
    public.is_admin()
    AND institution_id = public.get_my_institution_id()
  );

-- ============================================================
-- PARTIE 8 : RLS TABLE COMMENTS
-- ============================================================

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;

-- SELECT : Voir les commentaires des études accessibles
CREATE POLICY "comments_select_policy" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = comments.study_id
      AND (
        (public.is_client() AND s.client_id = auth.uid())
        OR (public.is_agent() AND s.assigned_agent_id = auth.uid())
        OR (public.is_admin() AND s.client_id IN (
          SELECT id FROM public.profiles 
          WHERE institution_id = public.get_my_institution_id()
        ))
      )
    )
  );

-- INSERT : Peut commenter sur les études accessibles
CREATE POLICY "comments_insert_policy" ON public.comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = study_id
      AND (
        (public.is_client() AND s.client_id = auth.uid())
        OR (public.is_agent() AND s.assigned_agent_id = auth.uid())
        OR (public.is_admin() AND s.client_id IN (
          SELECT id FROM public.profiles 
          WHERE institution_id = public.get_my_institution_id()
        ))
      )
    )
  );

-- ============================================================
-- PARTIE 9 : RLS TABLE NOTIFICATIONS
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;

-- SELECT : Seulement ses propres notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- UPDATE : Seulement ses propres notifications
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- ============================================================
-- PARTIE 10 : RLS TABLE INSTITUTIONS
-- ============================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institutions_select" ON public.institutions;
DROP POLICY IF EXISTS "institutions_select_policy" ON public.institutions;

-- SELECT : Voir seulement son institution
CREATE POLICY "institutions_select_policy" ON public.institutions
  FOR SELECT USING (
    id = public.get_my_institution_id()
  );

-- ============================================================
-- PARTIE 11 : AJOUTER EXPIRATION AUX INVITATIONS
-- ============================================================

-- Ajouter une valeur par défaut pour expires_at si pas déjà présent
DO $$
BEGIN
  -- Mettre à jour les invitations existantes sans expiration
  UPDATE public.invitations 
  SET expires_at = created_at + INTERVAL '7 days'
  WHERE expires_at IS NULL;
  
  -- Modifier la colonne pour avoir une valeur par défaut
  ALTER TABLE public.invitations 
  ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Column expires_at already has default or other error: %', SQLERRM;
END $$;

-- ============================================================
-- PARTIE 12 : GRANT PERMISSIONS
-- ============================================================

-- S'assurer que les fonctions sont accessibles
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_institution_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client() TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
