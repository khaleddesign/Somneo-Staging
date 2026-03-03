-- Correction du bug RLS pour les commentaires (Remplacement de "IN" par "EXISTS")

DROP POLICY IF EXISTS comments_select ON comments;
CREATE POLICY comments_select ON comments FOR SELECT
USING (
  auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
  OR (
    is_agent()
    AND EXISTS (
      SELECT 1
      FROM studies
      WHERE id = comments.study_id
        AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
    )
  )
  OR is_admin()
);

-- On corrige aussi l'historique qui avait la même erreur
DROP POLICY IF EXISTS history_select ON study_history;
CREATE POLICY history_select ON study_history FOR SELECT
USING (
  auth.uid() IN (SELECT client_id FROM studies WHERE id = study_history.study_id)
  OR (
    is_agent()
    AND EXISTS (
      SELECT 1
      FROM studies
      WHERE id = study_history.study_id
        AND (assigned_agent_id IS NULL OR assigned_agent_id = auth.uid())
    )
  )
  OR is_admin()
);