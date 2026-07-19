# syntax=docker/dockerfile:1
# --- build stage: install workspace, build the package then the demo ---
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable

# Manifests first for dependency-layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/sunroom/package.json packages/sunroom/
COPY examples/demo-site/package.json examples/demo-site/
RUN pnpm install --frozen-lockfile

# Sources (node_modules/.next/dist/.env* excluded by .dockerignore).
COPY . .
RUN pnpm --filter sunroom build
RUN pnpm --filter demo-site build

# --- runtime stage: git binary + next start ---
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
ENV NODE_ENV=production
ENV PORT=3000

# Whole built monorepo (retains scripts/ + e2e/ for the one-time seed).
COPY --from=build /app /app

WORKDIR /app/examples/demo-site
EXPOSE 3000
CMD ["pnpm", "start"]
