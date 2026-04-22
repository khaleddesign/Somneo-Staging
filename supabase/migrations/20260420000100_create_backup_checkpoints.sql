-- Checkpoint table for the backup-r2 Edge Function.
-- Stores a single row ('singleton') tracking which DB query and offset
-- the last backup run reached, so the next run can resume without re-scanning.
CREATE TABLE IF NOT EXISTS backup_checkpoints (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  -- 0 = study-files (studies.file_path)
  -- 1 = reports-files (studies.report_path)
  -- 2 = invoices-files (invoices.pdf_path)
  query_index SMALLINT NOT NULL DEFAULT 0,
  query_offset INTEGER NOT NULL DEFAULT 0,
  total_copied INTEGER NOT NULL DEFAULT 0,
  last_started_at TIMESTAMPTZ,
  last_completed_at TIMESTAMPTZ
);

-- Seed the singleton row so upsert logic in the Edge Function always finds it.
INSERT INTO backup_checkpoints (id) VALUES ('singleton') ON CONFLICT DO NOTHING;

-- Only service_role can read/write this table; no user-facing RLS needed.
ALTER TABLE backup_checkpoints ENABLE ROW LEVEL SECURITY;
