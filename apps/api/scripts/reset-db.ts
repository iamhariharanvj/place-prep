import { join } from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '../../../.env') });

const APP_TABLES = [
  'outbox_events',
  'notifications',
  'audit_logs',
  'reports',
  'message_tags',
  'comments',
  'votes',
  'answers',
  'questions',
  'notes',
  'experiences',
  'discussions',
  'messages',
  'resource_roadmaps',
  'resource_tags',
  'resources',
  'daily_tasks',
  'progress',
  'enrollments',
  'objectives',
  'milestones',
  'modules',
  'roadmaps',
  'refresh_tokens',
  'aliases',
  'tags',
  'users',
] as const;

async function resetDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const isSupabase = url.includes('supabase.co');
  const sql = postgres(url, {
    max: 1,
    ssl: isSupabase ? 'require' : undefined,
    connect_timeout: 15,
  });

  const tableList = APP_TABLES.join(', ');
  await sql.unsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

  await sql.end();
  console.log(`Cleared ${APP_TABLES.length} tables (schema_migrations preserved).`);
}

resetDb().catch((err) => {
  console.error(err);
  process.exit(1);
});
