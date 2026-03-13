-- Prix par type d'étude
CREATE TABLE invoice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_type text NOT NULL UNIQUE,
  price_ht numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO invoice_settings (study_type, price_ht, currency) VALUES
  ('PSG', 200.00, 'AED'),
  ('PV', 100.00, 'AED'),
  ('MSLT', 150.00, 'AED'),
  ('MWT', 150.00, 'AED');

-- Factures
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES profiles(id),
  mode text NOT NULL CHECK (mode IN ('per_study','monthly')),
  billing_month text,
  study_ids uuid[] NOT NULL DEFAULT '{}',
  subtotal_ht numeric(10,2) NOT NULL DEFAULT 0,
  tva_rate numeric(5,2) NOT NULL DEFAULT 0,
  total_ttc numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','cancelled')),
  pdf_path text,
  notes text,
  due_date date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_invoice_settings" ON invoice_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_invoices" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "client_own_invoices" ON invoices
  FOR SELECT USING (client_id = auth.uid());