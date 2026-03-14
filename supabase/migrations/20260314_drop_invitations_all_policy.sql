-- SC-009: Drop residual open policy on invitations table
--
-- The init schema created "invitations_all" allowing is_agent() full access.
-- The hardening migration (20260311) added admin-only policies but never
-- dropped this residual policy. Agents could therefore still read, insert,
-- update and delete any invitation row.

DROP POLICY IF EXISTS "invitations_all" ON public.invitations;
