-- Migration : 20260320_create_unassigned_reports.sql
--
-- Crée la table unassigned_reports pour stocker les PDFs uploadés sans étude.
-- Le PDF est copié vers reports-files/{study_id}/report.pdf lors de l'assignation
-- via PATCH /api/reports/unassigned/[id]/assign, puis la ligne est supprimée.

CREATE TABLE IF NOT EXISTS unassigned_reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path      TEXT        NOT NULL,       -- reports-files/unassigned/{agent_id}/{id}.pdf
  original_filename TEXT        NOT NULL,
  file_size         BIGINT      NOT NULL DEFAULT 0,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE unassigned_reports ENABLE ROW LEVEL SECURITY;

-- L'agent voit et gère uniquement ses propres rapports ; admin voit tout
CREATE POLICY "agent_own_unassigned" ON unassigned_reports
  FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR is_admin())
  WITH CHECK (agent_id = auth.uid() OR is_admin());

-- Index pour la liste filtrée par agent (requête la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_unassigned_reports_agent_id
  ON unassigned_reports (agent_id, uploaded_at DESC);
