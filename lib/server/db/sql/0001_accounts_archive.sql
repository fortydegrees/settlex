CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS settlex_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('guest', 'claimed')),
  current_username TEXT NOT NULL UNIQUE,
  avatar_emoji TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username_changed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, email)
);

CREATE UNIQUE INDEX IF NOT EXISTS account_emails_email_unique_idx
  ON account_emails (LOWER(email));

CREATE TABLE IF NOT EXISTS auth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS guest_sessions (
  selector TEXT PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guest_sessions_account_id_idx
  ON guest_sessions (account_id);

CREATE TABLE IF NOT EXISTS username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS username_history_account_id_idx
  ON username_history (account_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS username_history_open_username_unique_idx
  ON username_history (LOWER(username))
  WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS archived_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bgio_match_id TEXT NOT NULL UNIQUE,
  replay_id TEXT NOT NULL UNIQUE,
  game_name TEXT NOT NULL,
  ruleset_id TEXT,
  board_config_id TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ NOT NULL,
  winner_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  winner_seat_id TEXT,
  player_count INTEGER NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_match_players (
  archived_match_id UUID NOT NULL REFERENCES archived_matches(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('human', 'bot')),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  bot_key TEXT,
  username_snapshot TEXT NOT NULL,
  avatar_emoji_snapshot TEXT,
  avatar_color_snapshot TEXT,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (archived_match_id, seat_id)
);

CREATE TABLE IF NOT EXISTS archived_match_replays (
  archived_match_id UUID PRIMARY KEY REFERENCES archived_matches(id) ON DELETE CASCADE,
  initial_state_json JSONB NOT NULL,
  log_json JSONB NOT NULL,
  final_state_json JSONB,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
