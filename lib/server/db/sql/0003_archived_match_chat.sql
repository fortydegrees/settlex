CREATE TABLE IF NOT EXISTS archived_match_chat_messages (
  archived_match_id UUID NOT NULL REFERENCES archived_matches(id) ON DELETE CASCADE,
  message_seq INTEGER NOT NULL,
  actor_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (archived_match_id, message_seq)
);

CREATE INDEX IF NOT EXISTS archived_match_chat_messages_created_at_idx
  ON archived_match_chat_messages (archived_match_id, created_at ASC);
