-- Migration 005: Extended user profile (bio, links, college)

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS college text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS leetcode_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url text;
