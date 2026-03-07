-- ============================================
-- RLS HARDENING
-- ============================================

-- Fonction helper : retourne le rôle actuel de l'utilisateur (SECURITY DEFINER)
-- Utilisée dans WITH CHECK pour empêcher l'auto-élévation de rôle
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- FAILLE CRITIQUE : profiles_update permettait à un user de changer son propre rôle
-- Correction : WITH CHECK empêche toute modification du champ role sauf par admin
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (
    is_admin()
    OR (
      auth.uid() = id
      AND role = get_my_role()
    )
  );

-- Agents peuvent lire les prix (invoice_settings) pour affichage
CREATE POLICY "agents_read_invoice_settings" ON invoice_settings
  FOR SELECT USING (is_agent());

-- report_templates : agents peuvent créer/modifier des templates
CREATE POLICY "agents_manage_templates" ON report_templates
  FOR ALL TO authenticated
  USING (is_agent() OR is_admin())
  WITH CHECK (is_agent() OR is_admin());

-- notifications : les inserts se font via service role uniquement
-- Ajouter DELETE own pour permettre aux users de supprimer leurs notifs
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE USING (auth.uid() = user_id);
