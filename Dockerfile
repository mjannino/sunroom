# syntax=docker/dockerfile:1
# --- build stage: install workspace, build the package then the demo ---
FROM node:22-slim AS build
WORKDIR /app
# git is needed at BUILD time too: `next build` collects page data, which boots
# the git-backed store (`git init`). Without it the build fails with spawn ENOENT.
RUN corepack enable \
  && apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

# Manifests first for dependency-layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/sunroom/package.json packages/sunroom/
COPY examples/demo-site/package.json examples/demo-site/
RUN pnpm install --frozen-lockfile

# Sources (node_modules/.next/dist/.env* excluded by .dockerignore).
COPY . .
RUN pnpm --filter sunroom build
# Build the demo, then drop the throwaway content repo the build-time store
# created (runtime uses the /data volume via SUNROOM_CONTENT_DIR, not this).
RUN pnpm --filter demo-site build \
  && rm -rf examples/demo-site/.sunroom-content

# --- runtime stage: git binary + next start ---
FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=3000

# Whole built monorepo (retains scripts/ + e2e/ for the one-time seed).
COPY --from=build /app /app

WORKDIR /app/examples/demo-site
EXPOSE 3000
# Run the next binary directly (not `pnpm start`) so a fresh machine boots
# without corepack fetching pnpm from the registry on the auto-deploy path.
CMD ["node_modules/.bin/next", "start"]
