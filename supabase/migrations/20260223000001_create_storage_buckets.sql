-- Buckets Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('study-files', 'study-files', false, 2147483648, 
   ARRAY['application/octet-stream', 'application/zip']),
  ('report-files', 'report-files', false, 52428800,
   ARRAY['application/pdf']);

-- RLS Storage : study-files
CREATE POLICY "agents_read_study_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'study-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('agent','admin'))
  );

CREATE POLICY "clients_upload_study_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'study-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'client')
  );

CREATE POLICY "clients_read_own_reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'report-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "agents_upload_reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'report-files' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('agent','admin'))
  );
