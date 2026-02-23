-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Institutions (cliniques/hôpitaux)
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profils utilisateurs (lié à auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'agent', 'client')) NOT NULL,
  institution_id UUID REFERENCES institutions(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  role_invited TEXT DEFAULT 'client',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  institution_id UUID REFERENCES institutions(id) NOT NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Études du sommeil
CREATE TABLE studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  patient_reference TEXT NOT NULL,
  study_type TEXT CHECK (study_type IN ('PSG', 'PV')) NOT NULL,
  status TEXT CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule')) DEFAULT 'en_attente',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  assigned_agent_id UUID REFERENCES profiles(id),
  file_path TEXT,
  file_size_orig BIGINT,
  checksum TEXT,
  report_path TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historique des changements de statut
CREATE TABLE study_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- Commentaires / Messagerie par étude
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES studies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  message TEXT NOT NULL,
  attachment_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- FONCTIONS HELPER RLS (créées EN PREMIER)
-- ============================================

CREATE OR REPLACE FUNCTION is_agent()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================
-- POLITIQUES RLS
-- ============================================

-- RLS : profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_agent());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_agent());

-- RLS : institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_select" ON institutions FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE institution_id = institutions.id)
    OR is_agent()
  );
CREATE POLICY "institutions_insert" ON institutions FOR INSERT
  WITH CHECK (is_agent());
CREATE POLICY "institutions_update" ON institutions FOR UPDATE
  USING (is_agent());

-- RLS : invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_all" ON invitations
  USING (is_agent()) WITH CHECK (is_agent());

-- RLS : studies
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studies_select" ON studies FOR SELECT
  USING (auth.uid() = client_id OR is_agent());
CREATE POLICY "studies_insert" ON studies FOR INSERT
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "studies_update" ON studies FOR UPDATE
  USING (is_agent());

-- RLS : study_history
ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select" ON study_history FOR SELECT
  USING (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = study_history.study_id)
    OR is_agent()
  );
CREATE POLICY "history_insert" ON study_history FOR INSERT
  WITH CHECK (is_agent());

-- RLS : comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
    OR is_agent()
  );
CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
    OR is_agent()
  );
CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (auth.uid() = user_id OR is_agent());
