# PlacementPrep — Placement Preparation Portal

pnpm monorepo: **Next.js 14** + **NestJS 10** + **Drizzle** + **PostgreSQL (Supabase)** + **Redis (Upstash)** + **BullMQ**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind, TanStack Query |
| API | NestJS 10, Drizzle ORM, Zod validation |
| Database | Supabase PostgreSQL |
| Cache / Jobs | Upstash Redis + BullMQ worker |
| Deploy | Vercel (web), Railway/Render (API + worker) |

## Quick Start

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in SQL Editor (or CLI):
   - [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
   - [`supabase/migrations/002_outbox_vote_score.sql`](supabase/migrations/002_outbox_vote_score.sql)
   - Or run: `pnpm db:migrate` with `DATABASE_URL` set

### 2. Upstash Redis

Create a Redis database at [upstash.com](https://upstash.com) and copy the `rediss://` URL.

### 3. Environment

```bash
cp .env.example .env
# Set DATABASE_URL, REDIS_URL, JWT_SECRET
pnpm install
pnpm db:seed
```

### 4. Local dev

```bash
docker compose up -d redis   # local Redis (or use Upstash URL)
pnpm dev                     # API :4000, worker, web :3000
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Health | http://localhost:4000/api/v1/health |
| Swagger | http://localhost:4000/api/docs |

### Demo accounts (after seed)

Password: **`password123`**

| Email | Role |
|-------|------|
| admin@placement.dev | ADMIN |
| mentor@placement.dev | MENTOR |
| student@placement.dev | STUDENT |

## Deployment

Full step-by-step production guide: **[DEPLOY.md](DEPLOY.md)**

Quick summary:

| Service | Platform | Notes |
|---------|----------|--------|
| Web | Vercel | Root: `apps/web`, env: `NEXT_PUBLIC_API_URL` |
| API | Railway | Dockerfile `apps/api/Dockerfile`, start: `node dist/src/main.js` |
| Worker | Railway | Same image, start: `node dist/src/worker.js`, `RUN_MODE=worker` |
| DB | Supabase | Migrations via `pnpm db:migrate` |
| Redis | Upstash | `rediss://` URL |

## Project structure

```
apps/web/          Next.js 14 frontend
apps/api/          NestJS API + BullMQ worker entry
packages/shared/   Zod schemas, enums, types
supabase/          SQL migrations + schema.sql
```

See [`hld.md`](hld.md) and [`lld.md`](lld.md) for architecture details.
