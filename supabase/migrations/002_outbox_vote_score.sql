-- Migration 002: vote score denormalization, outbox, refresh tokens, votable trigger
-- See lld.md §5

ALTER TABLE messages ADD COLUMN IF NOT EXISTS vote_score INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status, created_at)
  WHERE status IN ('PENDING','FAILED');

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE OR REPLACE FUNCTION enforce_votable_message()
RETURNS TRIGGER AS $$
DECLARE v_type TEXT;
BEGIN
  SELECT type INTO v_type FROM messages WHERE id = NEW.message_id;
  IF v_type NOT IN ('QUESTION','ANSWER','NOTE','EXPERIENCE') THEN
    RAISE EXCEPTION 'Message type % is not votable', v_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_votes_votable ON votes;
CREATE TRIGGER trg_votes_votable
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION enforce_votable_message();
