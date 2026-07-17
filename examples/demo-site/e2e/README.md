# E2E: the create → edit → save → live loop, over HTTP

This proves the real Slice 1 loop end-to-end against a running
`pnpm --filter demo-site start`, without a reimplementation of any
action/store logic.

`action-loop.mjs` also proves the Slice 2 nested/array-field save: after the
plain hero-heading save, it saves a second edit that adds a Testimonials
section whose `quotes` field is an ARRAY of OBJECTS
(`quotes: [{ quote, author }]`), through the exact same `savePageAction`.
It then reads the saved page straight back off disk (the same file
`GitStore.savePage` just wrote) and asserts the nested `quotes[0].author`
value is present — proving a nested/array field edit round-trips through
the real save, not just a flat scalar prop.

`action-loop.mjs` also proves the Slice 3 `richText` save: a third edit sets
the Hero's `body` (a `richText` field, edited via TipTap in the real admin
UI — see `packages/sunroom/src/admin/editor/FieldControl.tsx`) to the HTML
string `<p>Hello <strong>world</strong></p>`, through the exact same
`savePageAction`. It reads the saved page back off disk and asserts
`hero.body` contains `<strong>world</strong>` verbatim (not escaped) —
proving the richText HTML string round-trips through the real save. Step 3
below then rebuilds + restarts the server and `curl`s the public route to
confirm that same HTML renders unescaped (Hero renders `body` via
`dangerouslySetInnerHTML`, deliberately unsanitized — see
`.superpowers/sdd/task-6-brief.md`'s "What this slice does NOT build").
TipTap's own typing/formatting gesture can't be driven in jsdom — see the
**Manual gesture checklist** below for that part.

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
# the nested/array field (Testimonials' `quotes: [{ quote, author }]`),
# rendered from the SAME saved page, over real HTTP:
curl -s localhost:3000/menu | grep -o '<cite>[^<]*</cite>'
# the richText field (Hero's `body`), rendered unescaped from the SAME
# saved page, over real HTTP:
curl -s localhost:3000/menu | grep -o '<strong>world</strong>'
```

## Manual gesture checklist (documented, not automated)

Per the testing boundary recorded throughout Phase 5 Slice 3: TipTap typing
and dnd-kit pointer-drag can't be driven in jsdom (no real contenteditable
input events or pointer-event sequences), and Playwright isn't available in
this environment (see above). `action-loop.mjs` proves everything on the
data side of these gestures — the HTML string / reordered array a real
gesture would produce round-trips through the real save and renders on the
public route. The gestures themselves — same status as the OAuth
handshake — must be checked by hand, once, in a real browser against
`pnpm --filter demo-site dev` (or `build && start`) at `/admin`:

- [ ] **richText formatting**: open a page with a Hero section, click into
      the Body field, type some text, select part of it and click **Bold**
      (and/or **Italic**, **H2**, **Bullet list**, **Link**), click **Save**.
      Reload the public route for that page — the formatting (`<strong>`,
      `<em>`, `<h2>`, `<ul><li>`, `<a href>`) renders correctly, not as
      literal tags or stripped.
- [ ] **Section drag-reorder**: with 2+ sections on a page, drag a section
      in the rail to a new position (pointer down on the drag handle, move,
      release). Click **Save**, then reload the editor (or the public
      route) — the new section order persists. Repeat with the **up/down**
      buttons as a fallback and confirm they still work.
- [ ] **Array-item drag-reorder**: on a field with an array control (e.g.
      Testimonials' `quotes`), drag one item above another, click **Save**,
      reload — the new item order persists (and each item's own field
      values stayed attached to the item, not left behind at the old
      index).
- [ ] **Preview reflects a save**: click **Show preview**, confirm the
      iframe shows the page's current public content; make an edit and
      click **Save**; confirm the preview iframe updates to show the new
      content (it reloads automatically on a successful save).
