-- Durcissement RLS pour le modèle pool/assignation
-- Ne modifie pas invitations : les agents peuvent inviter des clients

DROP POLICY IF EXISTS studies_update ON studies;
CREATE POLICY studies_update ON studies FOR UPDATE
USING (
  is_admin()
  OR (
    is_agent()
    AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
  )
)
WITH CHECK (
  is_admin()
  OR (
    is_agent()
    AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
  )
);

DROP POLICY IF EXISTS comments_select ON comments;
CREATE POLICY comments_select ON comments FOR SELECT
USING (
  auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
  OR (
    is_agent()
    AND auth.uid() IN (
      SELECT id
      FROM studies
      WHERE id = comments.study_id
        AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
    )
  )
  OR is_admin()
);

DROP POLICY IF EXISTS history_select ON study_history;
CREATE POLICY history_select ON study_history FOR SELECT
USING (
  auth.uid() IN (SELECT client_id FROM studies WHERE id = study_history.study_id)
  OR (
    is_agent()
    AND auth.uid() IN (
      SELECT id
      FROM studies
      WHERE id = study_history.study_id
        AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
    )
  )
  OR is_admin()
);