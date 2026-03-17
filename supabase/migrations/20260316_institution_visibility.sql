-- ============================================================================
-- INSTITUTION VISIBILITY — allow clients to see studies from same institution
-- ============================================================================

-- Extend can_access_study() to allow same-institution clients
-- The outer guard (client_profile.institution_id = p.institution_id)
-- remains the firewall — it cannot be crossed.
CREATE OR REPLACE FUNCTION can_access_study(study_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM studies s
    JOIN profiles p ON p.id = auth.uid()
    JOIN profiles client_profile ON client_profile.id = s.client_id
    WHERE s.id = study_id
    AND client_profile.institution_id = p.institution_id  -- outer institution guard (unchanged)
    AND (
      p.role = 'admin'
      OR s.client_id = auth.uid()
      OR s.assigned_agent_id = auth.uid()
      OR (p.role = 'agent' AND s.assigned_agent_id IS NULL)
      OR (p.role = 'client' AND client_profile.institution_id = p.institution_id)  -- NEW: same-institution clients
    )
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get all client IDs from the same institution as the current user
-- Used for efficient filtering in API routes
CREATE OR REPLACE FUNCTION get_my_institution_client_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM profiles
  WHERE institution_id = (
    SELECT institution_id FROM profiles WHERE id = auth.uid()
  )
    AND role = 'client'
$$;
