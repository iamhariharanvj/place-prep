import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '../../../.env') });

async function migrate() {
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

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await sql<{ filename: string }[]>`SELECT filename FROM schema_migrations`).map((r) => r.filename),
  );

  const migrationsDir = join(__dirname, '../../../supabase/migrations');
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }
    console.log(`Running ${file}...`);
    const content = readFileSync(join(migrationsDir, file), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    });
    console.log(`Done ${file}`);
  }

  await sql.end();
  console.log('Migrations complete');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
