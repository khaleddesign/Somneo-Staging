-- Reconcile production schema for report module (idempotent)
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure report_templates exists and is aligned
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  study_type text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS study_type text,
  ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.report_templates
SET sections = '[]'::jsonb
WHERE sections IS NULL;

ALTER TABLE public.report_templates
  ALTER COLUMN sections SET DEFAULT '[]'::jsonb;

-- 2) Ensure study_reports exists and is aligned
CREATE TABLE IF NOT EXISTS public.study_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id uuid REFERENCES public.studies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.profiles(id),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text DEFAULT 'draft',
  pdf_path text,
  created_at timestamptz DEFAULT now(),
  validated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.study_reports
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS study_id uuid,
  ADD COLUMN IF NOT EXISTS agent_id uuid,
  ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS pdf_path text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.study_reports
SET content = '{}'::jsonb
WHERE content IS NULL;

ALTER TABLE public.study_reports
  ALTER COLUMN content SET DEFAULT '{}'::jsonb,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN status SET DEFAULT 'draft';

-- 3) Add missing PKs/FKs/constraints/indexes safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_reports_pkey'
      AND conrelid = 'public.study_reports'::regclass
  ) THEN
    ALTER TABLE public.study_reports
      ADD CONSTRAINT study_reports_pkey PRIMARY KEY (id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_reports_study_id_fkey'
      AND conrelid = 'public.study_reports'::regclass
  ) THEN
    ALTER TABLE public.study_reports
      ADD CONSTRAINT study_reports_study_id_fkey
      FOREIGN KEY (study_id) REFERENCES public.studies(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_reports_agent_id_fkey'
      AND conrelid = 'public.study_reports'::regclass
  ) THEN
    ALTER TABLE public.study_reports
      ADD CONSTRAINT study_reports_agent_id_fkey
      FOREIGN KEY (agent_id) REFERENCES public.profiles(id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'study_reports_status_check'
      AND conrelid = 'public.study_reports'::regclass
  ) THEN
    ALTER TABLE public.study_reports
      ADD CONSTRAINT study_reports_status_check
      CHECK (status IN ('draft', 'validated'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'report_templates_study_type_check'
      AND conrelid = 'public.report_templates'::regclass
  ) THEN
    ALTER TABLE public.report_templates
      ADD CONSTRAINT report_templates_study_type_check
      CHECK (study_type IN ('PSG', 'PV', 'MSLT', 'MWT'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_study_reports_study_id ON public.study_reports(study_id);
CREATE INDEX IF NOT EXISTS idx_study_reports_agent_id ON public.study_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_study_reports_status ON public.study_reports(status);
CREATE INDEX IF NOT EXISTS idx_report_templates_study_type ON public.report_templates(study_type);

-- 4) RLS + policies (idempotent)
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'agents read templates'
  ) THEN
    CREATE POLICY "agents read templates"
      ON public.report_templates
      FOR SELECT
      TO authenticated
      USING (is_agent() OR is_admin());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'study_reports'
      AND policyname = 'agents manage reports'
  ) THEN
    CREATE POLICY "agents manage reports"
      ON public.study_reports
      FOR ALL
      TO authenticated
      USING (agent_id = auth.uid() OR is_admin());
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'study_reports'
      AND policyname = 'clients read reports'
  ) THEN
    CREATE POLICY "clients read reports"
      ON public.study_reports
      FOR SELECT
      TO authenticated
      USING (
        study_id IN (
          SELECT s.id
          FROM public.studies s
          WHERE s.client_id = auth.uid()
        )
      );
  END IF;
END$$;
