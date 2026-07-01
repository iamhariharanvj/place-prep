# Railway deployment

## API service

- **Dockerfile:** `apps/api/Dockerfile` (production target)
- **Start command:** `node dist/src/main.js`
- **Health check:** `/api/v1/health`

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (pooler port 6543) |
| `REDIS_URL` | Upstash Redis URL (`rediss://`) |
| `JWT_SECRET` | Access token signing secret (min 16 chars) |
| `CORS_ORIGIN` | Vercel web URL (e.g. `https://your-app.vercel.app`) |
| `RUN_MODE` | `api` |

## Worker service

Duplicate the API service with:

- **Start command:** `node dist/src/worker.js`
- **RUN_MODE:** `worker`
- Same `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

The worker registers BullMQ repeatable jobs (daily tasks, outbox, leaderboard reconcile, notifications) and seeds the leaderboard on startup.

## Web (Vercel recommended)

Deploy `apps/web` to Vercel with `NEXT_PUBLIC_API_URL` pointing to the Railway API URL + `/api/v1`.
