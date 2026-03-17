-- BATCH 1 — Tâche 1.3 : Idempotency keys table
-- Stores request results to prevent duplicate processing on retried requests.
-- TTL: 24 hours (cleaned by cron or periodic sweep).

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        TEXT        PRIMARY KEY,
  response   JSONB       NOT NULL,
  status     INTEGER     NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for TTL-based cleanup (cron selects old entries)
CREATE INDEX IF NOT EXISTS idx_idempotency_created_at
  ON idempotency_keys (created_at);

-- RLS: only service role can read/write (never exposed to anon/authenticated)
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- No policies = deny all for non-service-role (service role bypasses RLS)
