-- Pace is milestones per day; daily_tasks track which milestone each objective belongs to.

ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS milestone_id TEXT REFERENCES milestones(id) ON DELETE CASCADE;

UPDATE daily_tasks dt
SET milestone_id = o.milestone_id
FROM objectives o
WHERE o.id = dt.objective_id AND dt.milestone_id IS NULL;

ALTER TABLE daily_tasks ALTER COLUMN milestone_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_tasks_milestone ON daily_tasks(milestone_id);

COMMENT ON COLUMN enrollments.pace IS 'Number of milestones to assign per day (1-5)';
