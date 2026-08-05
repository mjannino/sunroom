# Reset staging

A manual button that resets **`sunroom-staging`** to a byte-identical baseline.
Staging is not a public demo — it is the environment where every Sunroom feature
is exercised, and its value is a reproducible known state.

## What it does

Fail-fast, in order (any step's failure stops the run):

1. **Wipe R2** — deletes every object in the `sunroom-staging` bucket.
2. **Reseed content** — `rm -rf /data/.sunroom-content` then re-runs the seed
   inside the machine.
3. **Restore schema** — copies the committed `examples/demo-site/.sunroom-schema.json`
   baseline over `/data/schema.json`.
4. **Re-upload seed media** — uploads `examples/demo-site/public/media/seed/*`
   to the fixed `seed/*` R2 keys.
5. **Restart** the machine so the in-memory store cache cold-loads the new volume.
6. **Smoke gate** — `smoke.mjs` asserts every page renders and every image
   resolves. Green = staging is trustworthy.

## When to click it

At the **start of a test session**, or after you've left staging in a messy
state. It is **not** part of normal deploy and does not run on merge.

## How to run it

GitHub → **Actions** → **Reset staging** → **Run workflow** → type
`sunroom-staging` in the confirm box → **Run**.

Only accounts with **write** access to the repo can trigger it. The public
(read-only) cannot.

## Recovery

Every step is idempotent, so if a run fails partway (leaving staging in a
known-bad partial state), just **run it again**. Read the failing step's log to
see what broke; the final **Smoke gate** step is the source of truth for whether
staging ended healthy.

## Insulation invariant — do not break

- This tooling lives **only** in `ops/reset-staging/`. Never move it under
  `packages/` (published to client apps) or `examples/` (copied as a template),
  and never `COPY` it into the Docker image. It is excluded via `.dockerignore`.
- Keep the trigger **`workflow_dispatch`-only**. Never add `push`/`schedule`.
- The wipe self-guards on bucket + host (`guards.mjs`); keep that check.

## What it deliberately does NOT do

- No rollback / snapshot (staging state is disposable by design).
- No production target (there is none; the constraint is code-leak, not a second
  environment).
- No in-app surface and no automatic run on deploy.

## One-time setup (maintainer)

In GitHub → Settings → Environments, create an environment named **`staging`**
and add these **Secrets** (not Variables): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`. `FLY_API_TOKEN` is inherited from the existing repo
secret. `R2_BUCKET` / `R2_PUBLIC_HOST` are plain workflow env (already public in
`fly.toml`).
