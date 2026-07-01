FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS development
COPY . .
RUN pnpm --filter @placement/shared build
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["pnpm", "dev"]

FROM deps AS builder
COPY . .
RUN pnpm --filter @placement/shared build
WORKDIR /app/apps/api
RUN pnpm build && test -f dist/src/main.js && test -f dist/src/worker.js

FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app/apps/api
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/packages/shared/package.json /app/packages/shared/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/src/main.js"]
