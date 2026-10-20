ALTER TABLE archived_match_replays
  ADD COLUMN IF NOT EXISTS notation_json JSONB,
  ADD COLUMN IF NOT EXISTS notation_status TEXT NOT NULL DEFAULT 'not-recorded',
  ADD COLUMN IF NOT EXISTS notation_error_code TEXT;

ALTER TABLE archived_match_replays
  ADD CONSTRAINT archived_match_notation_status_check CHECK (
    (notation_status = 'not-recorded' AND notation_json IS NULL AND notation_error_code IS NULL)
    OR (notation_status = 'unavailable' AND notation_json IS NULL
        AND notation_error_code IS NOT NULL
        AND COALESCE(notation_error_code IN ('unsupported-source', 'invalid-source', 'serialization', 'worker-error', 'worker-exit', 'worker-start', 'timeout', 'capacity'), FALSE))
    OR (notation_status = 'ready' AND notation_error_code IS NULL AND notation_json IS NOT NULL
        AND COALESCE(notation_json->>'format' = 'han-prototype', FALSE)
        AND COALESCE(notation_json->>'version' = '1', FALSE)
        AND COALESCE(notation_json->>'knowledge' = 'omniscient', FALSE)
        AND COALESCE(notation_json->>'coverage' = 'complete', FALSE)
        AND COALESCE(notation_json->>'rules' IN ('base-omniscient-prototype-1', 'base-friendly-omniscient-prototype-1', 'duel-friendly-omniscient-prototype-1'), FALSE)
        AND COALESCE(jsonb_typeof(notation_json->'board') = 'object', FALSE)
        AND COALESCE(jsonb_typeof(notation_json->'robber') = 'string', FALSE)
        AND COALESCE(jsonb_typeof(notation_json->'actions') = 'array', FALSE)
        AND COALESCE(jsonb_typeof(notation_json->'players') = 'array', FALSE)
        AND COALESCE(jsonb_typeof(notation_json->'result') = 'object', FALSE)
        AND COALESCE(length(notation_json->'result'->>'winner') > 0, FALSE))
  );
