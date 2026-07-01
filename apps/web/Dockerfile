FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS development
COPY . .
RUN pnpm --filter @placement/shared build
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM deps AS builder
COPY . .
RUN pnpm --filter @placement/shared build
WORKDIR /app/apps/web
RUN pnpm build

FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app/apps/web
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/next.config.js ./
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/web/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
