-- Create archived_at column on studies table
ALTER TABLE studies ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for queries on archived_at
CREATE INDEX IF NOT EXISTS idx_studies_archived_at ON studies(archived_at);
