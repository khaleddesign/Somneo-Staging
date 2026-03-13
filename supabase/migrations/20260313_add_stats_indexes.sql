-- Indexes for /api/stats and /api/stats/agents query performance
-- studies.status is filtered in 5+ queries (en_attente, en_cours, termine, etc.)
CREATE INDEX IF NOT EXISTS idx_studies_status
  ON studies (status);

-- studies.completed_at is filtered for date-range queries (termine_ce_mois, avg_turnaround)
CREATE INDEX IF NOT EXISTS idx_studies_completed_at
  ON studies (completed_at)
  WHERE completed_at IS NOT NULL;

-- studies.submitted_at is filtered for this_week and avg_turnaround queries
CREATE INDEX IF NOT EXISTS idx_studies_submitted_at
  ON studies (submitted_at)
  WHERE submitted_at IS NOT NULL;

-- Composite index for the most common query pattern: status + assigned_agent_id
-- Used by /api/stats/agents to fetch in-progress and completed studies per agent
CREATE INDEX IF NOT EXISTS idx_studies_status_agent
  ON studies (status, assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;

-- profiles.role is filtered for client/agent counts in /api/stats
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);
