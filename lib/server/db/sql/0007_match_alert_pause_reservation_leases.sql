ALTER TABLE match_alert_preferences
  ADD COLUMN IF NOT EXISTS pause_reservation_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_reservation_previous_reason TEXT,
  ADD COLUMN IF NOT EXISTS pause_reservation_previous_match_id TEXT,
  ADD COLUMN IF NOT EXISTS pause_reservation_previous_at TIMESTAMPTZ;

UPDATE match_alert_preferences
   SET pause_reservation_count = 1
 WHERE pause_reservation_id IS NOT NULL
   AND pause_reservation_count = 0;

DO $$
BEGIN
  ALTER TABLE match_alert_preferences
    ADD CONSTRAINT match_alert_preferences_pause_reservation_count_check
    CHECK (
      (pause_reservation_id IS NULL AND pause_reservation_count = 0)
      OR
      (pause_reservation_id IS NOT NULL AND pause_reservation_count > 0)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
