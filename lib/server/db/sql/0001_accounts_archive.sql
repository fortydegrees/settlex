CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS settlehex_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isAnonymous" BOOLEAN
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON auth_sessions ("userId");

CREATE TABLE IF NOT EXISTS auth_accounts (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("providerId", "accountId")
);

CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx
  ON auth_accounts ("userId");

CREATE TABLE IF NOT EXISTS auth_verifications (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx
  ON auth_verifications (identifier);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('guest', 'claimed')),
  current_username TEXT NOT NULL UNIQUE,
  avatar_emoji TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username_changed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
  winner_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  winner_seat_id TEXT,
  player_count INTEGER NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_match_players (
  archived_match_id UUID NOT NULL REFERENCES archived_matches(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('human', 'bot')),
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL ON UPDATE CASCADE,
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
