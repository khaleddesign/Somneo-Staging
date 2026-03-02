-- Met à jour la visibilité des études pour le nouveau modèle d'assignation
DROP POLICY IF EXISTS studies_select ON studies;

CREATE POLICY studies_select ON studies FOR SELECT
USING (
  auth.uid() = client_id
  OR auth.uid() = assigned_agent_id
  OR (assigned_agent_id IS NULL AND is_agent())
  OR is_admin()
);
