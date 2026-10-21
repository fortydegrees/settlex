ALTER TABLE archived_matches
  ADD COLUMN IF NOT EXISTS board_source_id TEXT;

ALTER TABLE archived_matches
  ADD COLUMN IF NOT EXISTS board_provenance_json JSONB;
