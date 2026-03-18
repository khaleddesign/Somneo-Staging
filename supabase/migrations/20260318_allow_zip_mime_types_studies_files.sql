-- Allow ZIP MIME types in the 'studies-files' storage bucket
-- Needed because Windows/browsers may send application/x-zip-compressed
-- instead of the standard application/zip for .zip files.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/octet-stream',
  'application/x-zip-compressed',
  'application/zip',
  'application/x-zip'
]
WHERE id = 'studies-files';
