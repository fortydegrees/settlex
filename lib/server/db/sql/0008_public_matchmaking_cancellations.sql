CREATE TABLE IF NOT EXISTS public_matchmaking_cancellations (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  mode_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, mode_id, request_id)
);

CREATE INDEX IF NOT EXISTS public_matchmaking_cancellations_expiry_idx
  ON public_matchmaking_cancellations (cancelled_at);
