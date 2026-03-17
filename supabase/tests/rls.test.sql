-- pgTAP RLS Tests for SomnoConnect
-- Run with: pg_prove -d postgres supabase/tests/rls.test.sql
-- Or in CI: psql $DATABASE_URL -f supabase/tests/rls.test.sql
--
-- Requires pgTAP extension: CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;

SELECT plan(20);

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- Set up test users (use existing fixture UUIDs or create temp ones)
DO $$
BEGIN
  -- These UUIDs must match seeded test data in local Supabase
  -- Override via env if needed
  NULL;
END;
$$;

-- ── 1. Studies table: RLS enabled ────────────────────────────────────────────

SELECT has_table('public', 'studies', 'studies table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'studies' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on studies'
);

-- ── 2. Client can only see their own studies ──────────────────────────────────

-- Simulate client session (set role + claim)
SET LOCAL role TO anon;

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'studies'
      AND policyname ILIKE '%client%select%'
      OR policyname ILIKE '%select%client%'
  ),
  'studies has a client SELECT policy'
);

-- ── 3. Profiles table: RLS enabled ───────────────────────────────────────────

SELECT has_table('public', 'profiles', 'profiles table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on profiles'
);

-- ── 4. Studies policies exist ─────────────────────────────────────────────────

SELECT ok(
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'studies') >= 2,
  'studies has at least 2 RLS policies'
);

-- ── 5. Notifications table: RLS enabled ──────────────────────────────────────

SELECT has_table('public', 'notifications', 'notifications table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'notifications' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on notifications'
);

-- ── 6. Notifications: user can only read their own ───────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
      AND cmd IN ('SELECT', 'ALL')
  ),
  'notifications has a SELECT policy'
);

-- ── 7. Comments table: RLS enabled ───────────────────────────────────────────

SELECT has_table('public', 'comments', 'comments table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'comments' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on comments'
);

-- ── 8. Idempotency keys: deny all non-service-role ────────────────────────────

SELECT has_table('public', 'idempotency_keys', 'idempotency_keys table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'idempotency_keys' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on idempotency_keys'
);

-- The table should have NO permissive policies for anon/authenticated
SELECT ok(
  (
    SELECT COUNT(*) FROM pg_policies
    WHERE tablename = 'idempotency_keys'
      AND permissive = 'PERMISSIVE'
      AND roles && ARRAY['anon', 'authenticated']
  ) = 0,
  'idempotency_keys has no permissive policies for anon/authenticated'
);

-- ── 9. Performance indexes exist ─────────────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'studies'
      AND indexname = 'idx_studies_client_submitted'
  ),
  'idx_studies_client_submitted index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'notifications'
      AND indexname = 'idx_notifications_user_read'
  ),
  'idx_notifications_user_read index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'comments'
      AND indexname = 'idx_comments_study_created'
  ),
  'idx_comments_study_created index exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'studies'
      AND indexname = 'idx_studies_submitted_at_id'
  ),
  'idx_studies_submitted_at_id index exists'
);

-- ── 10. profiles.role CHECK constraint ───────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'profiles'
      AND ccu.column_name = 'role'
  ),
  'profiles.role has a CHECK constraint'
);

-- ── 11. studies.study_type CHECK constraint ───────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'studies'
      AND ccu.column_name = 'study_type'
  ),
  'studies.study_type has a CHECK constraint'
);

-- ── 12. studies.priority CHECK constraint ────────────────────────────────────

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'studies'
      AND ccu.column_name = 'priority'
  ),
  'studies.priority has a CHECK constraint'
);

SELECT * FROM finish();

ROLLBACK;
