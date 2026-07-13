# Sunroom — Design Spec

**Date:** 2026-07-13
**Status:** Approved, pending implementation plan

---

## 1. What Sunroom Is

Sunroom is a deployable, site-agnostic CMS for bespoke client sites. It is installed into a static
Next.js site as an npm package and deployed once per client as its own small application.

The product line is deliberate and load-bearing:

- **The client owns content and composition.** Copy, images, which pages exist, what they are called,
  which sections appear on a page and in what order.
- **The developer owns layout and styling.** How a section looks, its internal layout, its CSS,
  its transitions, its behaviour. Sunroom never touches this.

Sunroom is not a page builder, a design tool, or a component library. It is a typed content layer that
knows how to render *your* components with *their* content.

### Non-goals for v1

- Drafts and preview-before-publish (saves are live). The design must not make this expensive to add later.
- Form builder and submission inbox.
- Global content editing (nav menus, footer). Navigation is derived from the page list instead.
- Nested layout containers (rows, columns, grids). Composition is a flat, ordered section list.
- Click-the-page inline editing. The editor is a form plus an iframe preview.
- Multi-tenancy. One Sunroom instance serves exactly one client site.

---

## 2. Architecture

Two artifacts and one contract.

| Artifact | What it is | Where it runs |
|---|---|---|
| `@sunroom/next` | npm package installed into a client site | The client's Next.js app |
| `sunroom` | The CMS: admin UI + content API | One deployment per client |
| `@sunroom/core` | Field schemas and manifest types — the shared contract | Both, as a dependency |

They communicate over HTTP with two keys: a **read key** (site → CMS, to fetch content) and a
**shared secret** (CMS → site, to fetch the manifest and to trigger revalidation).

### The contract: the manifest

The developer registers components with a field schema. The registry, minus the React components,
serializes to JSON — that JSON is the **manifest**. The CMS pulls it and generates editor forms from it.

This is why the developer's code is the single source of truth. There is no schema to keep in sync by
hand and no build step to forget.

### Data flow

```
                  manifest (GET, secret)
      ┌──────────────────────────────────────┐
      │                                      ▼
┌───────────┐                          ┌───────────┐         ┌──────────────┐
│  Sunroom  │  ── revalidate (POST) ─▶ │  Client   │         │ Content repo │
│    CMS    │                          │   site    │         │   (private)  │
│           │ ◀── content (GET, key) ─ │  (Next)   │         └──────────────┘
└───────────┘                          └───────────┘                 ▲
      │                                      │                       │
      │                                      └── snapshot at build ──┤
      └──────────────── commit + push ───────────────────────────────┘

                        ┌──────────┐
                        │ R2 / S3  │  ◀── presigned PUT (browser) ──┐
                        └──────────┘                                │
                              ▲                                     │
                              └───────── <img> at render ───────────┘
```

---

## 3. Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Site framework | **Next.js App Router** | RSC + a catch-all route makes CMS-defined routing natural; ISR resolves the "static but editable" tension; biggest ecosystem. |
| Delivery model | **Runtime fetch + on-demand revalidation** | Live edits in seconds with no rebuild and no CI wiring. Visitors are still served cached static HTML. |
| Topology | **One CMS instance per client site** | No tenant scoping anywhere. Simple auth, simple data, and each client can own their instance. |
| Composition | **Flat ordered list of sections** | Matches the product line. Clients want to move testimonials above pricing, not operate a layout engine. |
| Schema source | **Site exposes a manifest endpoint; CMS pulls it** | Code stays the single source of truth. No build step to forget, works in local dev. |
| Storage | **Git-backed JSON** | No database, no volume, no backup story to build. Continuous per-file point-in-time restore and an audit trail, for free. |
| Media | **S3-compatible (R2 default), presigned uploads** | The CMS never proxies bytes. Portable across R2/S3/MinIO. `next/image` handles optimization. |
| Auth | **Google OAuth + env allowlist** | No email infrastructure, no passwords, no reset burden. Real per-user identity, so git commits carry a genuine audit trail. |
| Monorepo | **pnpm workspaces** | Three packages sharing one contract. |

### Explicitly rejected

- **Postgres/SQLite.** A 20-page marketing site is a few hundred kilobytes of JSON. There is no query
  planner to earn its keep and no index to justify. A database here is a service you operate in exchange
  for capabilities you will never use.
- **Build-on-publish.** Every copy tweak becomes a 1–3 minute build, and CI must be wired per client.
- **A versioned migration system.** Cut deliberately. See §7.
- **`mailto:` forms.** Deferred with the rest of forms, but noted as a dead end: it depends on the
  *visitor's* mail client, drops leads silently, and leaks the client's address to scrapers.

---

## 4. Developer Experience

### Registering components

```ts
// sunroom.config.ts
import { defineSunroom, defineSection, f } from '@sunroom/next'
import Hero from '@/components/Hero'
import Testimonials from '@/components/Testimonials'

export default defineSunroom({
  sections: {
    hero: defineSection({
      label: 'Hero',
      component: Hero,
      thumbnail: '/sunroom/hero.png',   // optional; shown in the client's Add Section palette
      fields: {
        heading: f.text({ label: 'Heading', required: true }),
        body:    f.richText(),
        image:   f.image(),
        cta:     f.object({ label: f.text(), href: f.link() }),
      },
    }),
    testimonials: defineSection({
      label: 'Testimonials',
      component: Testimonials,
      fields: {
        quotes: f.array(f.object({ quote: f.text(), author: f.text() })),
      },
    }),
  },
})
```

`Hero` remains an ordinary React component with ordinary props. The `fields` block is the only addition,
and it is the entirety of what the client sees.

`defineSection` also accepts `deprecated: true`, which hides a section from the client's palette while
continuing to render existing instances. See §7.

### Field types (v1)

`text`, `textarea`, `richText`, `image`, `number`, `boolean`, `select`, `link`, `object`, `array`.

Each `f.*` returns a plain serializable descriptor: `{ type, label?, required?, ... }`. `object` and
`array` nest other descriptors. No functions, no validators — the registry must survive `JSON.stringify`.

Rich text is edited with TipTap and stored as an HTML string, so a component renders it directly.

### Routing

The entire routing setup for a client site:

```tsx
// app/[[...slug]]/page.tsx
import { SunroomPage, sunroomParams, sunroomMetadata } from '@sunroom/next'

export const generateStaticParams = sunroomParams
export const generateMetadata     = sunroomMetadata
export default SunroomPage
```

`SunroomPage` resolves the page by slug, walks its ordered section list, looks each `type` up in the
registry, and renders `<Component {...props} />`.

### Escape hatches

```ts
const pages = await getPages()        // [{ slug, title, position }] — feed a bespoke <Nav />
const page  = await getPage('about')  // pull CMS content into a hand-written route
```

`getPages()` is how navigation works without a nav editor.

### Routes the SDK auto-mounts

| Route | Caller | Purpose |
|---|---|---|
| `GET /api/sunroom/manifest` | CMS | Serves the serialized registry. Requires the shared secret. |
| `POST /api/sunroom/revalidate` | CMS, on save | Verifies the secret, calls `revalidateTag`. |

### CLI

| Command | Purpose |
|---|---|
| `sunroom check` | CI guardrail. Fails on orphaned content and destructive schema changes. See §7. |
| `sunroom snapshot` | Prebuild step. Writes all content into the bundle as a fallback. See §7. |
| `sunroom migrate ./script.js` | One-off content codemod runner. See §7. |

---

## 5. Storage

### The content repo

Each CMS instance is pointed at a **private content repo**, separate from the client's site code repo.
The CMS is its only writer.

```
content/
  pages/
    index.json          # one file per page — a save is one atomic write
    about.json
    services.json
  media/index.json      # image metadata only; bytes live in R2
  settings.json         # site url, seo defaults, redirects, cached manifest
```

Keeping content out of the *site* repo is deliberate: a content commit there would trip the site's CI and
redeploy on every copy tweak — precisely the build-on-publish model that was rejected.

**Images never enter git.** Binaries would bloat the repo irrecoverably. Git holds text; R2 holds bytes.

### Page document shape

```jsonc
// content/pages/about.json
{
  "slug": "about",
  "title": "About Us",
  "position": 2,
  "seo": { "title": "...", "description": "...", "ogImage": "media_01H..." },
  "sections": [
    { "id": "sec_01H...", "type": "hero", "props": { "heading": "...", "image": "media_01H..." } },
    { "id": "sec_01H...", "type": "testimonials", "props": { "quotes": [...] } }
  ]
}
```

`props` is shaped by that component's field schema. Adding a field to `Hero` therefore requires no
migration of any kind — the schema lives in code, and the store holds whatever shape that code declares.

### Reads are served from memory

At boot the CMS clones the repo and loads every JSON file into an in-memory index. The content API is
served from RAM — no disk read, no parse, no network per request. For a dataset this size, holding it all
in memory is not a compromise; it is the correct answer.

### A save, end to end

1. The client edits a field and saves.
2. The CMS takes an in-process write lock.
3. It verifies the base commit SHA the editor was loaded against (see §7, concurrency).
4. It updates the in-memory page, writes `content/pages/about.json`, **commits** (authored as the
   signed-in user), and **pushes**.
5. Only after the push succeeds does it `POST` to the site's `/api/sunroom/revalidate` with
   `{ tags: ['page:about'] }`.
6. The SDK verifies the secret and calls `revalidateTag('page:about')`. Next drops the cached HTML for
   `/about` and nothing else.

**The ordering is the point.** Push before revalidate: if the push fails, the in-memory state is rolled
back and the save is reported as failed — rather than showing a success toast for content that would
vanish on the next redeploy.

Structural changes (create, rename, delete a page) additionally revalidate a global `pages` tag, so the
nav updates everywhere at once.

---

## 6. The CMS Application

A Next.js app with a Dockerfile, deployed once per client.

### Screens

- **Pages** — list, create (slug + title), rename, delete, reorder. Order drives `getPages()`.
- **Page editor** — a left rail with the ordered section list (drag to reorder; `+ Add section` opens a
  palette built from the manifest, with thumbnails); a form on the right generated from the selected
  section's field schema; an iframe preview of the live page that reloads after save.
- **Media** — upload grid, alt text, and the picker that `f.image()` fields open.
- **Settings** — site URL, SEO defaults, "Refresh components".

### The manifest cache

The CMS pulls the manifest on boot and on demand, and **persists the last good copy in `settings.json`**.
If the client's site is down or mid-deploy, the client can still edit their content. They are never locked
out of the CMS because a build is broken.

### Auth

Google OAuth. `SUNROOM_EDITORS` in env holds an email allowlist. A session is a signed cookie derived
from a server-side secret. **No credentials are persisted anywhere** — which is exactly what a stateless
container wants.

An owner-bypass token in env exists for developer access.

Per-user identity is load-bearing beyond access control: every save is a git commit authored by the
signed-in user, so the audit trail is real.

### Content API (consumed by the SDK)

| Route | Auth | Returns |
|---|---|---|
| `GET /api/content/pages` | read key | `[{ slug, title, position }]` |
| `GET /api/content/pages/:slug` | read key | Full page, with media ids resolved to `{ url, width, height, alt }` |
| `GET /api/content/redirects` | read key | `[{ from, to }]` |
| `GET /api/content/snapshot` | read key | Entire content set, for the build-time snapshot |

Media ids are resolved server-side so components receive everything needed to render a correctly-sized
`next/image` with no layout shift.

---

## 7. Failure Modes and Their Solutions

Each failure is made **impossible by construction**, **caught in CI**, or **degraded but still serving**.
None are left as "warn and hope".

The through-line, which is the standard to hold the implementation to:

> **The CMS can be down, mid-deploy, or a version behind, and the client's site still serves correct pages.**

### CMS outage cannot break the site

The site must not have a hard runtime dependency on the CMS. ISR alone is insufficient — a cold cache plus
a down CMS is a dead site.

**Solution: a build-time snapshot as the floor.** `sunroom snapshot` runs as a prebuild step, pulls the
full content set, and writes it into the bundle. Resolution order at render time is **ISR cache → CMS →
snapshot**. A CMS outage degrades the site to "content as of last deploy" instead of taking it down. The
CMS is an enhancement layer, not a load-bearing runtime dependency.

### A failed revalidate webhook cannot strand content

A save is durable the moment it is pushed, so a webhook failure is staleness, never data loss. But a
permanently broken webhook (rotated secret, moved site) means the client edits and nothing changes.

**Solution: an ISR time floor of `revalidate: 300`.** Even with the webhook completely dead, the site
self-heals within five minutes. This demotes the webhook from a correctness requirement to a fast path —
it exists to make saves feel instant, not to make them work. On failure the CMS retries with backoff and
reports honestly ("Saved, but the site hasn't refreshed yet") rather than showing a green check.

### The git working copy can never be corrupt

**Solution: the remote is the only truth, and no durable local state exists.** Boot is unconditionally
`fetch && reset --hard origin/main`, discarding any mess from a crashed save. A save is one transaction —
write → commit → push — and any failure triggers a reset and an in-memory reload. There is no half-state
to recover from because the working copy is never trusted across a save boundary.

### Concurrent edits cannot silently clobber

One file per page means edits to *different* pages never touch the same file; git rebases those cleanly,
so that case is free.

For the same page: **optimistic concurrency**. The editor loads a page along with the commit SHA it was
based on and returns that SHA on save. If HEAD has moved for that file, the save is rejected with a real
conflict message. A silent clobber becomes a visible, correct refusal.

A rejected push (e.g. the repo was hand-edited) triggers one rebase-and-retry before surfacing an error.

### A rename or deletion cannot destroy content

**There is no migration system.** It was designed and then deliberately cut — it is the enterprise answer
to a problem that, at this scale, does not need one. The honest picture of schema evolution:

- **Adding a field** — free. Old content lacks the key, the component receives `undefined`, its default handles it.
- **Removing a field** — free. A dead key sits in the JSON. Harmless.
- **Renaming a field or changing its type** — the only genuinely destructive operation, and it is rare.

So instead:

- **No schema versions in content. No migrate-on-read. No migration chain.**
- **`sunroom check` catches the destructive case in CI**, reporting exactly which pages are affected:
  *"content on 3 pages uses `hero.heading`, which your schema no longer declares."* The rename cannot be
  merged.
- **`sunroom migrate ./rename-heading.js`** runs a one-off content codemod: load content, apply a plain
  function, write back as one commit. A script runner, not a framework. Inspect the diff; revert if wrong.

This is where git-backed storage pays for itself: a bad content migration is one `revert` away, with no
backup-and-restore dance.

### Deleting a component converges instead of breaking

`deprecated: true` hides a section from the client's palette (no new instances) while still rendering
existing ones. The CMS nudges the client to remove the remaining blocks. Once the count reaches zero,
`sunroom check` goes green and the code can be deleted. Removing a component becomes a process that
converges rather than an event that breaks a page.

### Renaming a page cannot break inbound links

**Solution: slug changes write a redirect automatically.** The CMS records the old slug in
`settings.json`; the SDK feeds these to Next's `redirects()`. Business cards, search rankings, and links
in old emails keep working — and the client never had to know it was something to worry about.

Deleting a page warns if a link field on another page points at it. Duplicate slugs are rejected. The
homepage cannot be deleted.

### Media upload failure cannot orphan a record

Metadata is committed only *after* the presigned R2 upload succeeds. An orphaned *blob* (uploaded, never
recorded) is harmless and reclaimable by a future `sunroom gc`.

### `sunroom check` — the CI guardrail

| Check | Severity |
|---|---|
| Content uses a section type with no `defineSection` in code | **Fail** |
| Content has props the schema no longer declares (destructive rename) | **Fail** |
| A registered section's fields do not match its component's props | **Fail** (also caught at the type level) |
| A component file matching an opt-in glob is registered nowhere | Warn |

Requires read access to the CMS from CI — a read-only call with the read key.

---

## 8. Repository Layout

```
packages/core          # field schemas + manifest types — the contract, shared by both sides
packages/next          # @sunroom/next — defineSunroom, SunroomPage, routes, getPages, CLI
apps/cms               # the CMS (Next.js + Dockerfile) — deployed once per client
examples/demo-site     # a bespoke demo site: reference implementation and E2E target
```

`packages/core` existing as its own package is load-bearing: it is the only code both the CMS and the
client sites depend on, and it is what keeps "the editor" and "the renderer" from growing into each other.

---

## 9. Implementation Phases

Each phase ends in a state that is demonstrable and independently verifiable.

### Phase 0 — Scaffolding

pnpm workspace, TypeScript project references, shared lint/format/test config (Vitest), CI running
lint + typecheck + test.

**Done when:** an empty test passes in all three packages under CI.

### Phase 1 — `@sunroom/core`: the contract

Field descriptor types and the `f.*` builders. Manifest types. Serialization and validation of a registry
into a manifest. Runtime validation of a `props` blob against a field schema.

**Done when:** a registry round-trips through `JSON.stringify` → parse → validate with no loss, and
malformed props are rejected with a useful error. Property-based tests over nested `object`/`array`.

### Phase 2 — `GitStore`: persistence

The `ContentStore` interface (`getPage`, `listPages`, `savePage`, `deletePage`, `media`, `settings`) and
its git-backed implementation. Boot clone + `reset --hard`. In-memory index. Write lock. Atomic
write → commit → push with reset-on-failure. Rebase-and-retry. Commit-SHA optimistic concurrency.

Tested against a **local bare repo in a temp dir** — no network. This is the component trusted least on
faith, so it is tested hardest: commit, push, conflicting push, rebase, crash mid-save, stale-SHA rejection.

**Done when:** the crash and conflict tests pass, and a killed process at any point in a save leaves the
store recoverable to a consistent state on next boot.

### Phase 3 — CMS: auth and content API

Google OAuth with the env allowlist, signed session cookies, owner bypass. The read-key-authenticated
content API (`pages`, `pages/:slug`, `redirects`, `snapshot`). Manifest fetch + persistence to
`settings.json`.

The SDK that *serves* a manifest does not exist until Phase 4, so manifest fetching is built and tested
here against a **static fixture manifest** served by a stub. Phase 4 replaces the stub with the real
endpoint; the fetch-and-persist logic does not change.

**Done when:** an integration test signs in, and the content API serves a fixture content repo with
correct auth rejection on a bad key.

### Phase 4 — `@sunroom/next`: the SDK

`defineSunroom` / `defineSection` / `f`. The manifest route handler. `SunroomPage`, `sunroomParams`,
`sunroomMetadata`. `getPages` / `getPage`. The revalidate route handler with secret verification.
Cache tags. The `revalidate: 300` floor.

**Done when:** a fixture Next app renders a page from a mocked CMS; unknown section types are skipped with
a dev warning; the revalidate route rejects a bad secret and busts the correct tag on a good one.

### Phase 5 — CMS: the editor

Pages list (create, rename, delete, reorder). The page editor: section rail with drag-reorder, the Add
Section palette built from the manifest, and the field-schema-driven form renderer (all v1 field types,
TipTap for `richText`). The iframe preview. Save → commit → revalidate, wired end to end.

**Done when:** a section can be added, edited, reordered, and saved, and the change appears on the live
site — via a real revalidation, not a full reload.

### Phase 6 — Media

R2/S3 adapter. Presigned upload from the browser. Media library UI. The `f.image()` picker. Media id →
`{ url, width, height, alt }` resolution in the content API. Commit-after-upload ordering.

**Done when:** an image is uploaded, chosen in a field, and rendered on the live site through
`next/image` with correct dimensions and no layout shift.

### Phase 7 — Resilience

Everything in §7 that is not already implicit in earlier phases: `sunroom snapshot` and the
cache → CMS → snapshot resolution chain; automatic slug redirects; `deprecated: true`; `sunroom check`;
`sunroom migrate`.

**Done when:** the site renders correctly **with the CMS process stopped and the ISR cache cold**; a slug
rename leaves the old URL redirecting; and `sunroom check` fails a destructive rename in CI.

Phase 7 is where the product's central promise is actually proven. It is not polish.

### Phase 8 — Demo site, E2E, and deployment

`examples/demo-site`: a small bespoke site with three or four real, fully-styled sections — the reference
implementation, and the E2E target.

One Playwright E2E walking the true path: sign in → create a page → add a section → edit a field → upload
an image → save. It asserts that **a commit landed in the test content repo and the revalidate webhook
fired**.

Dockerfile, deployment documentation, and a client-onboarding runbook (create the content repo, mint the
tokens, register the OAuth callback, set env).

**Done when:** a new client site can be stood up end to end by following the runbook alone.

---

## 10. Deferred, With the Door Left Open

| Feature | The door |
|---|---|
| **Drafts + preview** | Content is already git-backed and versioned; drafts become a branch and publish becomes a merge. All writes go through one `savePage()` service function, so the split touches one module. The SDK reserves `/api/sunroom/preview`. |
| **Forms + submission inbox** | Submissions are content: they land in the content repo and surface as an inbox screen. Notification is the one place a transactional email key (Resend) earns its keep — and it is a *form* dependency, not an *auth* one, so a broken key never locks anyone out of the CMS. |
| **Global content (nav, footer)** | Falls out of the existing field-schema machinery applied to a `globals.json`. |
| **Inline click-to-edit** | An iframe postMessage bridge over the existing editor. |
| **Postgres / other stores** | The `ContentStore` interface is the seam. |
| **Nested layout containers** | Would require reworking the flat section list into a tree. Deliberately not designed for; revisit only if a real client need appears. |
