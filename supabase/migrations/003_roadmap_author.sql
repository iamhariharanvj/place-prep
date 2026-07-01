-- Migration 003: Add created_by_id to roadmaps, add delete support for admin moderation

ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS created_by_id text REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS roadmaps_created_by_idx ON roadmaps(created_by_id);
