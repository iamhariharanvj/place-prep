# Production deployment guide

Step-by-step instructions to deploy **PlacementPrep** to production.

**Recommended stack**

| Component | Provider |
|-----------|----------|
| Frontend (Next.js) | [Vercel](https://vercel.com) |
| API + background worker | [Railway](https://railway.app) |
| PostgreSQL | [Supabase](https://supabase.com) |
| Redis | [Upstash](https://upstash.com) |

Estimated time: **45–60 minutes** (first time).

---

## Before you start

- [ ] GitHub repo with this code pushed
- [ ] Node **20+** locally (for running migrations)
- [ ] Accounts: Supabase, Upstash, Railway, Vercel

---

## Step 1 — Create Supabase database

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a region close to your users.
3. Save the **database password** (you cannot recover it later).

### Get connection strings

In Supabase → **Project Settings** → **Database** → **Connection string**:

| Use case | Pooler mode | Port |
|----------|-------------|------|
| Migrations & seed (local CLI) | Session | **5432** |
| API in production | Transaction | **6543** |

Copy both URIs. They look like:

```
postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

---

## Step 2 — Run database migrations

On your machine, from the repo root:

1. Copy env template:

```bash
cp .env.example .env
```

2. Set **`DATABASE_URL`** to the **5432** (session) pooler URI.

3. Install and migrate:

```bash
pnpm install
pnpm db:migrate
```

You should see migrations `001` through `005` applied. Re-running is safe (already-applied files are skipped).

4. *(Optional)* Seed demo accounts:

```bash
pnpm db:seed
```

Demo logins (password `password123`): `student@placement.dev`, `mentor@placement.dev`, `admin@placement.dev`.

> **Production tip:** Skip seed in production, or change passwords immediately after seeding.

---

## Step 3 — Create Upstash Redis

1. Go to [upstash.com](https://upstash.com) → **Create database**.
2. Choose the **same region** as Supabase/Railway if possible.
3. Copy the **`rediss://`** URL (TLS enabled).

Example:

```
rediss://default:YOUR_TOKEN@YOUR-ENDPOINT.upstash.io:6379
```

---

## Step 4 — Generate production secrets

Generate a strong JWT secret (min 16 characters; use 32+ in production):

```bash
openssl rand -base64 32
```

Save this value — you will use it for both API and worker services.

---

## Step 5 — Deploy the API on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your PlacementPrep repository.

### Configure the API service

| Setting | Value |
|---------|--------|
| **Builder** | Dockerfile |
| **Dockerfile path** | `apps/api/Dockerfile` |
| **Docker build target** | `production` |
| **Start command** | `node dist/src/main.js` |
| **Health check path** | `/api/v1/health` |
| **Port** | `4000` |

### Environment variables (API service)

In Railway → your service → **Variables**, add:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Supabase **6543** transaction pooler URI |
| `REDIS_URL` | Upstash `rediss://...` URL |
| `JWT_SECRET` | Your generated secret |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `REFRESH_TOKEN_DAYS` | `7` |
| `NODE_ENV` | `production` |
| `RUN_MODE` | `api` |
| `CORS_ORIGIN` | *(set in Step 8 after Vercel deploy)* |

3. Deploy and wait for the build to finish.
4. Open **Settings** → **Networking** → **Generate domain**.
5. Copy the public URL, e.g. `https://placementprep-api-production.up.railway.app`.

### Verify API

```bash
curl https://YOUR-RAILWAY-API-DOMAIN/api/v1/health
```

Expected:

```json
{"status":"ok","db":true,"redis":true}
```

If `db` or `redis` is `false`, fix `DATABASE_URL` / `REDIS_URL` and redeploy.

---

## Step 6 — Deploy the worker on Railway

The worker runs BullMQ jobs: daily tasks, leaderboard sync, outbox processing.

1. In the **same Railway project**, click **+ New** → **GitHub Repo** (same repo) — or **Duplicate service**.
2. Use the **same Dockerfile** (`apps/api/Dockerfile`, target `production`).
3. Change settings:

| Setting | Value |
|---------|--------|
| **Start command** | `node dist/src/worker.js` |
| **Public networking** | Disabled (no public URL needed) |

4. Set the **same env vars** as the API, except:

| Variable | Value |
|----------|--------|
| `RUN_MODE` | `worker` |

5. Deploy. Check logs — you should see worker/cron registration messages without errors.

---

## Step 7 — Deploy the web app on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project** → import your GitHub repo.
2. Configure:

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` |
| **Framework** | Next.js (auto-detected) |

Build settings are already in `apps/web/vercel.json` (monorepo install + shared package build).

3. **Environment variables** (Production):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-RAILWAY-API-DOMAIN/api/v1` |

4. Click **Deploy**.

5. Copy your Vercel URL, e.g. `https://placement-prep.vercel.app`.

---

## Step 8 — Connect frontend and API (CORS)

1. Go back to **Railway** → API service → **Variables**.
2. Set:

```
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Use the exact origin (no trailing slash). If you use a custom domain on Vercel, use that instead.

3. Redeploy the API service (Railway usually auto-redeploys on env change).

---

## Step 9 — Production smoke test

### 9.1 Health

```bash
curl https://YOUR-RAILWAY-API-DOMAIN/api/v1/health
```

### 9.2 Login

```bash
curl -X POST https://YOUR-RAILWAY-API-DOMAIN/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@placement.dev","password":"password123"}'
```

*(Skip if you did not run seed.)*

### 9.3 Full API suite (optional)

With API running locally or in prod:

```bash
API_TEST_URL=https://YOUR-RAILWAY-API-DOMAIN/api/v1 pnpm --filter @placement/api test:api
```

### 9.4 Browser checklist

Open your Vercel URL and verify:

- [ ] Register / login works
- [ ] Student dashboard loads
- [ ] Mentor profile loads
- [ ] Posting a doubt works (details ≥ 10 characters)
- [ ] Roadmaps list loads
- [ ] Leaderboard loads

---

## Step 10 — Custom domain (optional)

### Vercel (frontend)

1. Vercel project → **Settings** → **Domains** → add your domain.
2. Update DNS as instructed.
3. Update Railway `CORS_ORIGIN` to match the new domain.

### Railway (API)

1. API service → **Settings** → **Networking** → **Custom Domain**.
2. Update Vercel `NEXT_PUBLIC_API_URL` to `https://api.yourdomain.com/api/v1`.
3. Redeploy Vercel.

---

## Environment variable reference

### API & Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase pooler URI (port **6543** for API) |
| `REDIS_URL` | Yes | Upstash `rediss://` URL |
| `JWT_SECRET` | Yes | Min 16 chars; use 32+ random bytes in prod |
| `JWT_ACCESS_EXPIRES` | No | Default `15m` |
| `REFRESH_TOKEN_DAYS` | No | Default `7` |
| `CORS_ORIGIN` | Yes | Exact Vercel / custom web origin |
| `NODE_ENV` | Yes | `production` |
| `RUN_MODE` | Yes | `api` or `worker` |
| `PORT` | No | Railway sets automatically; default `4000` |

### Web (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://<api-host>/api/v1` |

---

## Troubleshooting

### Health returns `"db": false`

- Use the **transaction pooler** URI (port **6543**), not the direct `db.*.supabase.co` host.
- Confirm password and project ref in the connection string.
- Ensure Supabase project is not paused (free tier).

### Health returns `"redis": false`

- Use **`rediss://`** (TLS), not `redis://`, for Upstash.
- Check token and endpoint in the Upstash dashboard.

### CORS errors in browser

- `CORS_ORIGIN` must exactly match the web origin (scheme + host, no path).
- Redeploy API after changing `CORS_ORIGIN`.
- Do not use `*` with credentials.

### Login works locally but not in production

- Confirm `NEXT_PUBLIC_API_URL` on Vercel points to the Railway API + `/api/v1`.
- Check browser Network tab for 401/403/CORS on `/auth/login`.

### 400 when posting doubts

- **Details** field must be at least **10 characters** (API validation).

### Worker not assigning daily tasks

- Confirm worker service is running (`RUN_MODE=worker`).
- Check worker logs in Railway for Redis/DB connection errors.

---

## Deploy checklist (print this)

```
[ ] Supabase project created
[ ] Migrations 001–005 applied (pnpm db:migrate)
[ ] Upstash Redis created
[ ] JWT_SECRET generated and stored securely
[ ] Railway API deployed + public domain
[ ] GET /api/v1/health → ok, db:true, redis:true
[ ] Railway worker deployed (RUN_MODE=worker)
[ ] Vercel web deployed (root: apps/web)
[ ] NEXT_PUBLIC_API_URL set on Vercel
[ ] CORS_ORIGIN set on Railway API
[ ] Browser login + core flows tested
[ ] Demo passwords changed (if seeded)
```

---

## Alternative: Docker on a VPS

If you prefer a single server instead of Railway/Vercel:

```bash
# From repo root
docker build -f apps/api/Dockerfile --target production -t placement-api .
docker build -f apps/web/Dockerfile --target production -t placement-web .

docker run -d --name api -p 4000:4000 --env-file .env -e RUN_MODE=api -e NODE_ENV=production placement-api
docker run -d --name worker --env-file .env -e RUN_MODE=worker -e NODE_ENV=production placement-api node dist/src/worker.js
docker run -d --name web -p 3000:3000 -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 placement-web
```

You still need managed PostgreSQL (Supabase) and Redis (Upstash) unless you run those on the VPS too.

---

## Related docs

- [`README.md`](README.md) — local development
- [`RAILWAY.md`](RAILWAY.md) — Railway quick reference
- [`apps/api/scripts/test-apis.ts`](apps/api/scripts/test-apis.ts) — API smoke tests
