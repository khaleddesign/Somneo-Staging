-- BATCH 3 — Performance indexes manquants
-- Identified by audit: full scans on notifications, studies(client_id), comments

-- ── notifications ──────────────────────────────────────────────────────────
-- NotificationBell polls this on every render: WHERE user_id = $1 ORDER BY created_at DESC
-- Without index: full table scan on every poll across all users
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, read, created_at DESC);

-- ── studies (client view) ───────────────────────────────────────────────────
-- Client dashboard: WHERE client_id = $1 ORDER BY submitted_at DESC
-- Without index: full scan of studies table for every client page load
CREATE INDEX IF NOT EXISTS idx_studies_client_submitted
  ON studies (client_id, submitted_at DESC);

-- ── comments ───────────────────────────────────────────────────────────────
-- StudyComments loads: WHERE study_id = $1 ORDER BY created_at ASC
-- Without index: full scan of comments table on every discussion tab open
CREATE INDEX IF NOT EXISTS idx_comments_study_created
  ON comments (study_id, created_at ASC);

-- ── studies (submitted_at for cursor pagination) ────────────────────────────
-- Cursor-based pagination: WHERE submitted_at < $cursor ORDER BY submitted_at DESC
-- Covering index that also includes id for the nextCursor extraction
CREATE INDEX IF NOT EXISTS idx_studies_submitted_at_id
  ON studies (submitted_at DESC, id);

-- Update planner statistics immediately
ANALYZE notifications;
ANALYZE studies;
ANALYZE comments;
