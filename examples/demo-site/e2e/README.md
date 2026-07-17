# E2E: the create → edit → save → live loop, over HTTP

This proves the real Slice 1 loop end-to-end against a running
`pnpm --filter demo-site start`, without a reimplementation of any
action/store logic.

**Playwright was tried first** (per the Phase 5 Slice 1 plan's preference)
and rejected: this environment has no passwordless `sudo`, and Playwright's
Chromium needs system libraries (`libnspr4` etc.) that can only be installed
that way. `npx playwright install chromium` downloads fine; launching it
fails with `error while loading shared libraries: libnspr4.so`. See
`.superpowers/sdd/task-7-report.md` for the transcript.

## What this harness does instead

`action-loop.mjs` imports the REAL `createPageAction` / `savePageAction`
from `sunroom/actions` (the exact functions `PagesScreen.tsx` /
`PageEditor.tsx` call from the browser) and calls them directly from a plain
Node process, authenticated with a REAL owner-token session cookie obtained
from the running server's own `/api/sunroom/auth/owner` endpoint.

Two things needed patching to make that import work outside of Next's own
bundler — see `node-loader.mjs`'s and the fake modules' comments for the
full "why":

- `next/headers`, `next/cache`, `server-only` don't resolve/behave under
  plain Node (no bundler, and `server-only`'s module body throws by design
  outside a bundled server graph). `node-loader.mjs` is a `node:module`
  resolve hook that redirects these to small stand-ins.
- `next/headers`'s `cookies()` is redirected to `fake-next-headers.mjs`,
  which reads `SUNROOM_MOCK_SESSION_COOKIE` — **a real cookie value**, not a
  fabricated one. `getSession()` → `verifySession()` runs completely
  unmodified and really checks that HMAC signature.
- `next/cache`'s `revalidatePath()` is redirected to a no-op logger
  (`fake-next-cache.mjs`): revalidation only means something inside a live
  Next request, and this script isn't one.

## The one real limitation this implies

`getStore()`'s page index is cached in memory, one instance per content
directory **per process** (see `packages/sunroom/src/store/singleton.ts`).
This script runs in its own process, so its writes land for real on disk and
in git, but the _already-running_ `next start` process won't see them until
it restarts and cold-loads the store fresh. Restarting is enough to prove
the on-disk + git-store + rendering pipeline is correct end-to-end over
real HTTP for a route that was never statically pre-rendered (e.g. a
brand-new page). A route that already got baked into static HTML at build
time (like `/` here, whose nav comes from `getPages()`) stays stale until
the app is rebuilt — this is standard Next SSG behavior, not a store bug. A
real Playwright click-through calling the action from _inside_ the live
server process would hit `revalidatePath` for real and avoid the rebuild.

## Running it

```bash
# 1. build & start once (creates the initial content dir), then own-token login:
pnpm --filter demo-site build
pnpm --filter demo-site start &
curl -s -c cookies.txt -X POST localhost:3000/api/sunroom/auth/owner -d 'token=dev-owner-token'
curl -s -b cookies.txt localhost:3000/admin | grep -o 'data-screen="pages"'   # authed admin renders

# 2. stop the server, extract the real cookie, run the action loop against the
#    SAME .sunroom-content directory:
kill %1
COOKIE=$(awk -F'\t' '/sunroom_session/ {print $7}' cookies.txt)
set -a; source .env.local; set +a
SUNROOM_MOCK_SESSION_COOKIE="$COOKIE" node --import ./e2e/register-loader.mjs e2e/action-loop.mjs
git -C .sunroom-content log --oneline   # real commits, authored by Owner

# 3. rebuild (so the statically-generated "/" nav picks up the new page) and
#    restart — now everything is visible live over HTTP:
pnpm --filter demo-site build
pnpm --filter demo-site start &
curl -s localhost:3000/menu | grep -o '<h1>[^<]*</h1>'
curl -s localhost:3000/ | grep -o 'href="/menu"'
```
