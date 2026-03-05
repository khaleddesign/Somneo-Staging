CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  study_type TEXT NOT NULL CHECK (study_type IN ('PSG', 'PV', 'MSLT', 'MWT')),
  sections JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE study_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES studies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  pdf_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents read templates" ON report_templates
  FOR SELECT TO authenticated USING (is_agent() OR is_admin());

CREATE POLICY "agents manage reports" ON study_reports
  FOR ALL TO authenticated
  USING (agent_id = auth.uid() OR is_admin());

CREATE POLICY "clients read reports" ON study_reports
  FOR SELECT TO authenticated
  USING (study_id IN (
    SELECT id FROM studies WHERE client_id = auth.uid()
  ));
