-- Migration 004: Mentor company on user profile

ALTER TABLE users ADD COLUMN IF NOT EXISTS company text;
