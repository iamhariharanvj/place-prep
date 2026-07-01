# Railway deployment

## Fix: `DATABASE_URL` / `REDIS_URL` Required

If logs show `Missing required environment variables: DATABASE_URL, REDIS_URL`:

**Your local `.env` file is NOT copied into the Docker image.** You must set variables in the Railway dashboard.

1. Open [Railway](https://railway.app) → your project → **API service** (not the web service).
2. Go to **Variables** tab.
3. Add each variable below (use **Raw Editor** to paste all at once).

```env
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
REDIS_URL=rediss://default:[TOKEN]@[host].upstash.io:6379
JWT_SECRET=your-long-random-secret-min-16-chars
NODE_ENV=production
RUN_MODE=api
CORS_ORIGIN=https://your-app.vercel.app
JWT_ACCESS_EXPIRES=15m
REFRESH_TOKEN_DAYS=7
```

4. Click **Deploy** or wait for automatic redeploy.
5. Check logs — you should see `API running on http://localhost:4000` (or similar), not Zod errors.

### Where to get values

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase → Settings → Database → **Transaction pooler** URI (port **6543**) |
| `REDIS_URL` | Upstash → your database → **rediss://** connection string |
| `JWT_SECRET` | Run `openssl rand -base64 32` locally |
| `CORS_ORIGIN` | Your Vercel URL (exact, no trailing slash) |

### Worker service

Duplicate the API service and set `RUN_MODE=worker`, start command `node dist/src/worker.js`.  
Copy the **same** `DATABASE_URL`, `REDIS_URL`, and `JWT_SECRET`.

### Shared variables (optional)

Railway → Project → **Shared Variables** lets you define `DATABASE_URL` once for both API and worker.

---

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
