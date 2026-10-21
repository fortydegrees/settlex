ALTER TABLE match_alert_preferences
  ADD COLUMN IF NOT EXISTS pause_reservation_id UUID;

DO $$
BEGIN
  ALTER TABLE match_alert_preferences
    ADD CONSTRAINT match_alert_preferences_pause_reservation_check
    CHECK (
      pause_reservation_id IS NULL
      OR (
        enabled = TRUE
        AND paused_reason = 'human_game'
        AND paused_match_id IS NOT NULL
        AND paused_at IS NOT NULL
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
