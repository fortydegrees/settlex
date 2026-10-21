CREATE TABLE IF NOT EXISTS match_alert_preferences (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  paused_reason TEXT CHECK (paused_reason IS NULL OR paused_reason = 'human_game'),
  paused_match_id TEXT,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (paused_reason IS NULL AND paused_match_id IS NULL AND paused_at IS NULL)
    OR
    (enabled = TRUE AND paused_reason IS NOT NULL AND paused_match_id IS NOT NULL AND paused_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS match_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS match_alert_subscriptions_account_id_idx
  ON match_alert_subscriptions (account_id);

CREATE TABLE IF NOT EXISTS match_alert_events (
  match_id TEXT PRIMARY KEY,
  seeker_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempted_count INTEGER NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  expired_count INTEGER NOT NULL DEFAULT 0 CHECK (expired_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0)
);

CREATE INDEX IF NOT EXISTS match_alert_events_seeker_announced_idx
  ON match_alert_events (seeker_account_id, announced_at DESC);
