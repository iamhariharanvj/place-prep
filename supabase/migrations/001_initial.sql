-- Migration 001: core schema + complete_objective stored procedure

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'MENTOR', 'ADMIN')),
  display_name TEXT NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  streak_count INT NOT NULL DEFAULT 0,
  last_active_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aliases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  display_name TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  carry_forward BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_modules_roadmap ON modules(roadmap_id);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_milestones_module ON milestones(module_id);

CREATE TABLE IF NOT EXISTS objectives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  milestone_id TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('READ','PRACTICE','QUIZ','PROJECT','MOCK_INTERVIEW')),
  xp_reward INT NOT NULL DEFAULT 10,
  "order" INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objectives_milestone ON objectives(milestone_id);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  pace INT NOT NULL DEFAULT 2,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, roadmap_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);

CREATE TABLE IF NOT EXISTS progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED','SKIPPED')),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, objective_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);

CREATE TABLE IF NOT EXISTS daily_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','SKIPPED')),
  carry_forward BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, objective_id, assigned_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, assigned_date);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ARTICLE','VIDEO','PDF','REPO')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  description TEXT,
  submitted_by_id TEXT NOT NULL REFERENCES users(id),
  approved_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS resource_tags (
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE TABLE IF NOT EXISTS resource_roadmaps (
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, roadmap_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL CHECK (type IN ('QUESTION','ANSWER','NOTE','EXPERIENCE','DISCUSSION')),
  author_id TEXT NOT NULL REFERENCES users(id),
  alias_id TEXT REFERENCES aliases(id),
  visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','SEMI_ANONYMOUS','PRIVATE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_type_created ON messages(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(author_id);

CREATE TABLE IF NOT EXISTS questions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  accepted_answer_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS answers (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(message_id) ON DELETE CASCADE,
  body TEXT NOT NULL
);

ALTER TABLE questions
  ADD CONSTRAINT fk_accepted_answer
  FOREIGN KEY (accepted_answer_id) REFERENCES answers(message_id);

CREATE TABLE IF NOT EXISTS notes (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiences (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discussions (
  message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  value INT NOT NULL CHECK (value IN (1, -1)),
  UNIQUE(user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_message ON votes(message_id);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  alias_id TEXT REFERENCES aliases(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_message ON comments(message_id);

CREATE TABLE IF NOT EXISTS message_tags (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, tag_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REVIEWED','DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admin_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DAILY_TASK','RESOURCE_APPROVED','RESOURCE_REJECTED','ANSWER_ACCEPTED')),
  payload JSONB NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS roadmaps_updated_at ON roadmaps;
CREATE TRIGGER roadmaps_updated_at BEFORE UPDATE ON roadmaps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION complete_objective(p_user_id TEXT, p_objective_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_objective objectives%ROWTYPE;
  v_roadmap_id TEXT;
  v_progress progress%ROWTYPE;
  v_user users%ROWTYPE;
  v_today DATE := (timezone('UTC', now()))::DATE;
  v_last_active DATE;
  v_streak INT;
  v_diff INT;
BEGIN
  SELECT o.* INTO v_objective FROM objectives o WHERE o.id = p_objective_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Objective not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT m.roadmap_id INTO v_roadmap_id
  FROM milestones ms
  JOIN modules m ON m.id = ms.module_id
  WHERE ms.id = v_objective.milestone_id;

  INSERT INTO progress (id, user_id, objective_id, status, completed_at)
  VALUES (gen_random_uuid()::text, p_user_id, p_objective_id, 'COMPLETED', now())
  ON CONFLICT (user_id, objective_id) DO UPDATE
  SET status = 'COMPLETED', completed_at = now()
  RETURNING * INTO v_progress;

  UPDATE daily_tasks
  SET status = 'COMPLETED'
  WHERE user_id = p_user_id
    AND objective_id = p_objective_id
    AND assigned_date = v_today;

  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_user.last_active_date IS NULL THEN
    v_streak := 1;
  ELSE
    v_last_active := (timezone('UTC', v_user.last_active_date))::DATE;
    v_diff := v_today - v_last_active;
    IF v_diff = 1 THEN
      v_streak := v_user.streak_count + 1;
    ELSIF v_diff > 1 THEN
      v_streak := 1;
    ELSE
      v_streak := v_user.streak_count;
    END IF;
  END IF;

  UPDATE users
  SET xp = v_user.xp + v_objective.xp_reward,
      streak_count = v_streak,
      last_active_date = now()
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  RETURN jsonb_build_object(
    'progress', to_jsonb(v_progress),
    'user', jsonb_build_object('xp', v_user.xp, 'streakCount', v_user.streak_count),
    'roadmapId', v_roadmap_id,
    'xpAwarded', v_objective.xp_reward
  );
END;
$$;
