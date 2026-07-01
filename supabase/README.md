# Supabase migrations

Run in Supabase SQL Editor (in order):

1. [`migrations/001_initial.sql`](migrations/001_initial.sql)
2. [`migrations/002_outbox_vote_score.sql`](migrations/002_outbox_vote_score.sql)

Or from the repo root with `DATABASE_URL` set:

```bash
pnpm db:migrate
pnpm db:seed
```

[`schema.sql`](schema.sql) is the concatenated reference for one-shot apply.
