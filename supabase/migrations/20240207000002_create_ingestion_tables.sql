-- ingestion_uploads: audit for each CSV upload
-- ingestion_runs: per-upload run tracking
-- @see docs/INGESTION_WORKFLOW.md

CREATE TABLE ingestion_uploads (
  upload_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by_user_id TEXT,
  uploaded_by_email TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_s3_key TEXT,
  file_sha256 TEXT,
  source_system TEXT NOT NULL DEFAULT 'clover',
  rows_received INTEGER,
  months_detected TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failure')),
  error_message TEXT
);

CREATE TABLE ingestion_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES ingestion_uploads(upload_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  inserted_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  months_affected TEXT[],
  recompute_status TEXT DEFAULT 'pending' CHECK (recompute_status IN ('pending', 'success', 'failure')),
  nova_status TEXT DEFAULT 'pending' CHECK (nova_status IN ('pending', 'success', 'failure')),
  error_message TEXT
);

CREATE INDEX idx_ingestion_runs_upload ON ingestion_runs(upload_id);
