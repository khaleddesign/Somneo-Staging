-- ==============================================================================
-- FIX: STANDARDISATION DU NOM DE BUCKET STORAGE 'reports-files'
-- Résout le conflit entre 'report-files' et 'reports-files' des migrations précédentes.
-- Le code TypeScript s'attend à 'reports-files'.
-- ==============================================================================

-- 1. On s'assure que le bon bucket 'reports-files' (au pluriel) existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports-files', 
  'reports-files', 
  false, 
  52428800, -- 50 MB
  '{application/pdf,application/zip,application/json,text/plain}'
)
ON CONFLICT (id) DO NOTHING;

-- 2. On s'assure que la policy RLS pour 'reports-files' de lecture sécurisée fonctionne bien
DROP POLICY IF EXISTS "secured_read_report_files" ON storage.objects;
DROP POLICY IF EXISTS "secured_read_report_files_new" ON storage.objects;

CREATE POLICY "secured_read_reports_files_new" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports-files'
    AND (
      -- La fonction can_access_study (définie dans 20260311000100_security_hardening.sql)
      -- vérifie proprement l'accès via RLS basés sur les rôles et institutions
      public.can_access_study( (string_to_array(name, '/'))[1]::uuid )
    )
  );

-- 3. Si un bucket nommé 'report-files' (sans le 's') a été créé par la migration initiale,
-- on retire la policy qui l'autorisait pour éviter toute fuite. Par sécurité on bloque tout accès dessus.
DROP POLICY IF EXISTS "secured_read_report_files" ON storage.objects;
