# Sunroom — Design Spec

**Date:** 2026-07-13
**Status:** Approved, pending implementation plan

---

## 1. What Sunroom Is

Sunroom is an npm package that turns a bespoke Next.js site into a client-editable one.

You build a fully styled, component-based site for a client. You install Sunroom, register your
components with a field schema, and the client gets a CMS at `/admin` on their own domain — served by
their own site, in the same process.

The product line is deliberate and load-bearing:

- **The client owns content and composition.** Copy, images, which pages exist, what they are called,
  which sections appear on a page and in what order.
- **The developer owns layout and styling.** How a section looks, its internal layout, its CSS, its
  transitions, its behaviour. Sunroom never touches this.

Sunroom is not a page builder, a design tool, or a component library. It is a typed content layer that
knows how to render _your_ components with _their_ content.

**Sunroom is site-agnostic, not framework-agnostic.** One codebase serves every client; it targets Next.js
App Router exclusively, and that coupling is where the simplicity comes from. See §3.

### Non-goals for v1

- Drafts and preview-before-publish (saves are live). The design must not make this expensive to add later.
- Form builder and submission inbox.
- Global content editing (nav menus, footer). Navigation is derived from the page list instead.
- Nested layout containers (rows, columns, grids). Composition is a flat, ordered section list.
- Click-the-page inline editing. The editor is a form plus an iframe preview.
- Multi-tenancy. One installation serves exactly one client site.
- Any framework other than Next.js App Router.

---

## 2. Architecture

**There is no CMS deployment.** Sunroom is a single npm package that mounts into the client's Next app.
The client's site _is_ the deployment: `acme.com` serves the site, `acme.com/admin` serves the CMS, and
both are one Next process in one container.

### The integration surface

Four files, and that is the whole of it:

```
sunroom.config.ts                        # your component registry
app/[[...slug]]/page.tsx                 # the public site   → SunroomPage
app/admin/[[...segments]]/page.tsx       # the CMS           → SunroomAdmin
app/api/sunroom/[[...route]]/route.ts    # oauth callback + upload presigning
```

### Everything is in-process

The renderer and the editor share memory.

- `SunroomPage` reads the content index **by function call**, not over HTTP.
- The admin **imports the registry directly** from `sunroom.config.ts`. There is no manifest, no
  serialization boundary, no protocol.
- A save is a server action that mutates the index, commits to git, and calls `revalidateTag()` **in the
  same function body**. It cannot fail to arrive.

The only network calls in the entire system are the R2 upload and the R2 backup mirror. Neither is on the
critical path for serving a page or saving an edit.

### Why this is right

An earlier revision of this design had Sunroom as a separately-deployed CMS talking to the site over HTTP:
a manifest endpoint, a read key, a shared secret, a revalidation webhook with retry logic, a manifest
cache, and four distinct failure modes. **Every one of those was an artifact of it being a distributed
system.** Merging the two deleted them all. When a design change erases most of your failure-mode section,
the failure modes were telling you the architecture was wrong.

### Data flow

```
┌──────────────────────────────────────────────────┐
│  One Next.js container (the client's site)       │
│                                                  │
│   /            SunroomPage  ──┐                  │
│   /admin       SunroomAdmin ──┤                  │      ┌───────────┐
│                               ▼                  │      │  R2 / S3  │
│                        ContentStore              │      │           │
│                               │                  │      │  media    │
│                               ▼                  │      │  backups  │
│                    local git repo (volume)  ─────┼─────▶│           │
│                                                  │      └───────────┘
│                    build-time snapshot           │            ▲
└──────────────────────────────────────────────────┘            │
                                                       presigned PUT
                                                        (browser)
```

---

## 3. Technology Decisions

| Decision      | Choice                                                    | Rationale                                                                                                                                                                               |
| ------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework     | **Next.js App Router, exclusively**                       | A catch-all route makes CMS-defined routing natural; server actions + `revalidateTag` make the in-process design possible. The coupling _is_ the simplification.                        |
| Packaging     | **One npm package, mounted into the site**                | No second deployment, no protocol between two halves, no keys, no webhooks.                                                                                                             |
| Hosting       | **Long-lived Node container** (Fly, Railway, Render, VPS) | The store needs a persistent process and a writable disk.                                                                                                                               |
| Delivery      | **In-process reads + `revalidateTag` on save**            | Live edits in milliseconds. Visitors are still served cached static HTML.                                                                                                               |
| Composition   | **Flat ordered list of sections**                         | Matches the product line. Clients want to move testimonials above pricing, not operate a layout engine.                                                                                 |
| Schema source | **The registry in your code, imported directly**          | Code is the single source of truth. Nothing to sync, no build step to forget.                                                                                                           |
| Storage       | **Local git repo on the volume**                          | Full history, per-file point-in-time restore, an audit trail, and safe revertible migrations — with **zero external dependencies and zero setup**. Git is a local binary, not a vendor. |
| Durability    | **Mirror to R2 after each commit**                        | R2 is already in the stack for media, so this adds no new vendor, account, or token. Never on the save path.                                                                            |
| Media         | **S3-compatible (R2 default), presigned uploads**         | The app never proxies bytes. Portable across R2/S3/MinIO. `next/image` handles optimization.                                                                                            |
| Auth          | **Google OAuth + env allowlist**                          | No email infrastructure, no passwords, no reset burden. Real per-user identity, so git commits carry a genuine audit trail.                                                             |

### The dependency ledger

| Service          | Used for                      | If it's down                                                                                  |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Google           | Sign-in only                  | The client can't log in. **The site serves normally.**                                        |
| R2               | Media storage + backup mirror | **Saves still work** (durable locally). Backups queue and retry. Existing images still serve. |
| _(nothing else)_ |                               |                                                                                               |

**Nothing external is required for the client's website to serve, or for the client to edit content.**

### Explicitly rejected

- **Postgres / SQLite.** A 20-page marketing site is a few hundred kilobytes of JSON. There is no query
  planner to earn its keep and no index to justify. A database here is a service you operate in exchange
  for capabilities you will never use.
- **A git remote (GitHub or otherwise).** The remote was an unnecessary external dependency and a
  per-client setup chore. A local repo delivers every benefit that made git the right choice; R2 covers
  durability using infrastructure already in the stack.
- **Build-on-publish.** Every copy tweak becomes a multi-minute build.
- **Serverless hosting.** Incompatible with the in-process store. Chosen against deliberately.
- **A versioned migration system.** Designed, then cut. See §7.
- **Framework-agnosticism / a headless HTTP API.** Would preserve the serialization boundary — paid for on
  every client — to serve a site that may never exist. The `ContentStore` interface remains the seam if
  this is ever wrong.
- **`mailto:` forms.** Deferred with the rest of forms, but noted as a dead end: it depends on the
  _visitor's_ mail client, drops leads silently, and leaks the client's address to scrapers.

---

## 4. Developer Experience

### Registering components

```ts
// sunroom.config.ts
import { defineSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";

export default defineSunroom({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      thumbnail: "/sunroom/hero.png", // optional; shown in the client's Add Section palette
      fields: {
        heading: f.text({ label: "Heading", required: true }),
        body: f.richText(),
        image: f.image(),
        cta: f.object({ label: f.text(), href: f.link() }),
      },
    }),
    testimonials: defineSection({
      label: "Testimonials",
      component: Testimonials,
      fields: {
        quotes: f.array(f.object({ quote: f.text(), author: f.text() })),
      },
    }),
  },
});
```

`Hero` remains an ordinary React component with ordinary props. The `fields` block is the only addition,
and it is the entirety of what the client sees.

`defineSection` also accepts `deprecated: true`, which hides a section from the client's palette while
continuing to render existing instances. See §7.

### Field types (v1)

`text`, `textarea`, `richText`, `image`, `number`, `boolean`, `select`, `link`, `object`, `array`.

Each `f.*` returns a plain descriptor: `{ type, label?, required?, ... }`. `object` and `array` nest other
descriptors.

Rich text is edited with TipTap and stored as an HTML string, so a component renders it directly.

> Note: descriptors no longer need to survive `JSON.stringify` — the admin imports them directly. They are
> kept plain and serializable anyway, because the CLI reads them and because a serializable registry keeps
> the door open to a headless mode.

### Routing

```tsx
// app/[[...slug]]/page.tsx
import { SunroomPage, sunroomParams, sunroomMetadata } from "sunroom";

export const generateStaticParams = sunroomParams;
export const generateMetadata = sunroomMetadata;
export default SunroomPage;
```

`SunroomPage` resolves the page by slug, walks its ordered section list, looks each `type` up in the
registry, and renders `<Component {...props} />`.

`/admin` and `/api` are more specific routes and therefore win over the catch-all. To prevent a client
from shadowing their own CMS, **`admin` and `api` are reserved slugs** and the CMS rejects them.

### Escape hatches

```ts
const pages = await getPages(); // [{ slug, title, position }] — feed a bespoke <Nav />
const page = await getPage("about"); // pull CMS content into a hand-written route
```

`getPages()` is how navigation works without a nav editor.

### CLI

| Command                       | Purpose                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `sunroom check`               | CI guardrail. Fails on orphaned content and destructive schema changes. See §7. |
| `sunroom snapshot`            | Prebuild step. Bakes content into the image. See §7.                            |
| `sunroom migrate ./script.js` | One-off content codemod runner. See §7.                                         |
| `sunroom restore`             | Rebuild a volume from the R2 backup. See §5.                                    |

---

## 5. Storage

### Layout on the volume

```
/data/content/          # a local git repository — no remote, no tokens, no setup
  pages/
    index.json          # one file per page — a save is one atomic write
    about.json
    services.json
  media/index.json      # image metadata only; bytes live in R2
  settings.json         # site settings, seo defaults, redirects
```

`git init` runs on first boot. There is no remote. Git is an implementation detail of the store — you never
run a git command, and the client never learns the word.

**Images never enter git.** Binaries would bloat the repo irrecoverably. Git holds text; R2 holds bytes.

### Page document shape

```jsonc
// pages/about.json
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

At boot the store loads every JSON file into an in-memory index. Reads are RAM. For a dataset this size,
holding it all in memory is not a compromise; it is the correct answer.

### A save

1. The admin server action takes an in-process write lock.
2. It verifies the base commit SHA the editor was loaded against (§7, concurrency).
3. It updates the in-memory page, writes `pages/about.json`, and **commits** — authored as the signed-in
   user.
4. It calls `revalidateTag('page:about')` **in the same function**. Next drops the cached HTML for
   `/about` and nothing else.
5. It queues an R2 mirror.

**Total: a few milliseconds. No network on the save path.** The save is durable the moment the commit
lands on the volume.

Structural changes (create, rename, delete a page) additionally revalidate a global `pages` tag, so the
nav updates everywhere at once.

### The R2 backup mirror

After a commit lands, the store mirrors two objects to the media bucket:

- **`content.bundle`** — a `git bundle` of the entire repository. Full history in one file. Restore is a
  `git clone` of the bundle. A few hundred kilobytes.
- **The plain JSON tree** — so content can be read and restored with no tooling and no git knowledge.

**The mirror can never fail a save.** The save has already succeeded on the volume. The mirror retries with
backoff, and the CMS shows a quiet "backup pending" state. Making R2 a hard requirement for _editing_
would reintroduce exactly the external fragility this design exists to avoid.

### Boot resolution order

1. The volume has a repo → **use it.**
2. Fresh volume, R2 bundle exists → **restore from the bundle** (`sunroom restore` does this manually too).
3. No bundle, but the image has a build-time snapshot → **seed the repo from the snapshot.**
4. Nothing at all → **`git init` an empty site.**

Every path ends with the site serving.

### Deployment constraint: a single instance

The app holds mutable state in memory _and_ on disk. **It must run as one instance.** Two containers means
a save on one leaves the other with a stale index and a stale ISR cache.

One container is amply sufficient for a small-business marketing site. But this is a real constraint, not
a free choice, and it must be documented in the onboarding runbook — otherwise a future replica-count bump
produces a genuinely baffling bug.

---

## 6. The Admin

Mounted at `/admin` in the client's own site. Four screens, no more.

- **Pages** — list, create (slug + title), rename, delete, reorder. Order drives `getPages()`.
- **Page editor** — a left rail with the ordered section list (drag to reorder; `+ Add section` opens a
  palette built from the registry, with thumbnails); a form on the right generated from the selected
  section's field schema; an iframe preview of the live page that reloads after save.
- **Media** — upload grid, alt text, and the picker that `f.image()` fields open.
- **Settings** — SEO defaults, redirects, backup status.

The admin **imports the registry directly**. There is no manifest to fetch, cache, or invalidate, and no
state in which the editor and the renderer disagree about what components exist.

### Auth

Google OAuth. `SUNROOM_EDITORS` in env holds an email allowlist. A session is a signed cookie derived from
a server-side secret. **No credentials are persisted anywhere.** An owner-bypass token in env exists for
developer access.

Per-user identity is load-bearing beyond access control: every save is a git commit authored by the
signed-in user, so the audit trail is real.

The OAuth callback is on the client's own domain (`acme.com/api/sunroom/auth/callback`). One Google OAuth
app serves every client; each deploy adds a callback URL.

---

## 7. Failure Modes and Their Solutions

Each failure is made **impossible by construction**, **caught in CI**, or **degraded but still serving**.
None are left as "warn and hope."

The standard to hold the implementation to:

> **Nothing external can stop the client's site from serving, or stop the client from editing it.**

### The site must boot even if R2 is unreachable

Merging the CMS into the site created a new and more serious single point of failure: if content can't be
loaded, the _website_ is down, not just the CMS.

**Solution: content is baked into the image at build.** `sunroom snapshot` runs as a prebuild step and
writes the content tree into the bundle. Boot resolution (§5) falls back to it. A fresh volume with R2
unreachable still serves — content as of the last deploy — rather than failing to start.

### The volume can be lost

**Solution: the R2 mirror**, plus the build snapshot as a second floor. Worst realistic case is losing the
seconds between the last commit and the last successful mirror.

`sunroom restore` rebuilds a volume from the bundle.

### The git working copy can never be corrupt

**Solution: a save is one transaction** — write → commit — and any failure resets the working tree and
reloads the in-memory index from disk. The working copy is never trusted across a save boundary. Because
the commit is local and atomic, there is no partially-pushed state to reconcile.

### Concurrent edits cannot silently clobber

One file per page means edits to _different_ pages never touch the same file.

For the same page: **optimistic concurrency**. The editor loads a page along with the commit SHA it was
based on and returns that SHA on save. If HEAD has moved for that file, the save is rejected with a real
conflict message. A silent clobber becomes a visible, correct refusal.

### A rename or deletion cannot destroy content

**There is no migration system.** It was designed and then deliberately cut — it is the enterprise answer
to a problem that, at this scale, does not need one. The honest picture of schema evolution:

- **Adding a field** — free. Old content lacks the key, the component receives `undefined`, its default handles it.
- **Removing a field** — free. A dead key sits in the JSON. Harmless.
- **Renaming a field or changing its type** — the only genuinely destructive operation, and it is rare.

So instead:

- **No schema versions in content. No migrate-on-read. No migration chain.**
- **`sunroom check` catches the destructive case in CI**, reporting exactly which pages are affected:
  _"content on 3 pages uses `hero.heading`, which your schema no longer declares."_ The rename cannot be
  merged.
- **`sunroom migrate ./rename-heading.js`** runs a one-off content codemod: load content, apply a plain
  function, commit. A script runner, not a framework. Inspect the diff; `revert` if wrong.

This is where git-backed storage pays for itself: a bad content migration is one revert away, with no
backup-and-restore dance.

### Deleting a component converges instead of breaking

`deprecated: true` hides a section from the client's palette (no new instances) while still rendering
existing ones. The CMS nudges the client to remove the remaining blocks. Once the count reaches zero,
`sunroom check` goes green and the code can be deleted. Removing a component becomes a process that
converges rather than an event that breaks a page.

### Renaming a page cannot break inbound links

**Solution: slug changes write a redirect automatically.** The CMS records the old slug in `settings.json`;
the SDK feeds these to Next's `redirects()`. Business cards, search rankings, and links in old emails keep
working — and the client never had to know it was something to worry about.

Deleting a page warns if a link field on another page points at it. Duplicate slugs are rejected. `admin`
and `api` are reserved. The homepage cannot be deleted.

### Media upload failure cannot orphan a record

Metadata is committed only _after_ the presigned R2 upload succeeds. An orphaned _blob_ (uploaded, never
recorded) is harmless and reclaimable by a future `sunroom gc`.

### `sunroom check` — the CI guardrail

| Check                                                                | Severity                                 |
| -------------------------------------------------------------------- | ---------------------------------------- |
| Content uses a section type with no `defineSection` in code          | **Fail**                                 |
| Content has props the schema no longer declares (destructive rename) | **Fail**                                 |
| A registered section's fields do not match its component's props     | **Fail** (also caught at the type level) |
| A component file matching an opt-in glob is registered nowhere       | Warn                                     |

Runs entirely locally: it reads the content repo and imports the registry. No running service required.

---

## 8. Repository Layout

```
packages/sunroom       # the single package
  src/core/            #   field schemas, types
  src/store/           #   ContentStore + GitStore + R2 mirror
  src/render/          #   SunroomPage, getPages, getPage
  src/admin/           #   the editor UI
  src/api/             #   oauth callback, upload presigning
  src/cli/             #   check, snapshot, migrate, restore
examples/demo-site     # a bespoke reference site + E2E target
```

---

## 9. Implementation Phases

Each phase ends in a state that is demonstrable and independently verifiable.

### Phase 0 — Scaffolding

pnpm workspace, TypeScript, subpath exports from the package, shared lint/format/test config (Vitest), CI
running lint + typecheck + test.

**Done when:** an empty test passes under CI, and `examples/demo-site` imports the package.

### Phase 1 — The registry

Field descriptor types and the `f.*` builders. `defineSunroom` / `defineSection`. Runtime validation of a
`props` blob against a field schema.

**Done when:** a registry type-checks, and malformed props are rejected with a useful error. Property-based
tests over nested `object` / `array`.

### Phase 2 — `GitStore`: persistence

The `ContentStore` interface (`getPage`, `listPages`, `savePage`, `deletePage`, `media`, `settings`) and its
local-git implementation. `git init` on first boot. In-memory index. Write lock. Atomic write → commit with
reset-on-failure. Commit-SHA optimistic concurrency.

Boot resolution (§5) is built here **only for the two local paths** — existing repo, and `git init` on an
empty volume. The R2-bundle and snapshot paths depend on machinery that does not exist until Phases 6 and
7; the resolution chain is written with those as explicit gaps and filled in there.

Tested against a **temp directory**, no network. This is the component trusted least on faith, so it is
tested hardest: commit, stale-SHA rejection, crash mid-save, and both local boot paths.

**Done when:** a process killed at any point during a save leaves the store recoverable to a consistent
state on the next boot.

### Phase 3 — Rendering

`SunroomPage`, `sunroomParams`, `sunroomMetadata`. `getPages` / `getPage`. Cache tags. Reserved slugs.

**Done when:** `examples/demo-site` renders real pages from a fixture content repo, and unknown section
types are skipped with a dev-time warning.

### Phase 4 — Auth

Google OAuth, the env allowlist, signed session cookies, owner bypass. Route protection for `/admin`.

**Done when:** an allowlisted user can sign in, a non-allowlisted user cannot, and `/admin` is unreachable
while signed out.

### Phase 5 — The editor

Pages list (create, rename, delete, reorder). The page editor: section rail with drag-reorder, the Add
Section palette built from the registry, and the field-schema-driven form renderer (all v1 field types,
TipTap for `richText`). The iframe preview. Save → commit → `revalidateTag`, wired end to end.

**Done when:** a section can be added, edited, reordered, and saved, and the change appears on the live
site — via a real revalidation, not a full reload.

### Phase 6 — Media

R2/S3 adapter. Presigned upload from the browser. Media library UI. The `f.image()` picker. Media id →
`{ url, width, height, alt }` resolution at render. Commit-after-upload ordering.

**Done when:** an image is uploaded, chosen in a field, and rendered on the live site through `next/image`
with correct dimensions and no layout shift.

### Phase 7 — Durability and resilience

The R2 backup mirror (bundle + JSON tree) with retry and backup status in the UI. `sunroom snapshot` and
the build-time snapshot floor. `sunroom restore`. Automatic slug redirects. `deprecated: true`.
`sunroom check`. `sunroom migrate`.

**Done when:**

- The site boots and serves **on a fresh volume with R2 unreachable** (snapshot path).
- The site boots and serves **on a fresh volume with R2 reachable** (bundle-restore path).
- A slug rename leaves the old URL redirecting.
- `sunroom check` fails a destructive rename in CI.

Phase 7 is where the product's central promise is proven. **It is not polish.** If schedule pressure
appears, this is the phase that will look cuttable and is not.

### Phase 8 — Demo site, E2E, and onboarding

`examples/demo-site`: a small bespoke site with three or four real, fully-styled sections — the reference
implementation and the E2E target.

One Playwright E2E walking the true path: sign in → create a page → add a section → edit a field → upload
an image → save → assert the change is live and a commit landed.

Dockerfile, deployment documentation, and a client-onboarding runbook (provision the container and volume,
create the R2 bucket, register the OAuth callback, set env, **pin to one instance**).

**Done when:** a new client site can be stood up end to end by following the runbook alone.

---

## 10. Deferred, With the Door Left Open

| Feature                                    | The door                                                                                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Drafts + preview**                       | Content is already git-backed and versioned; drafts become a branch and publish becomes a merge. All writes go through one `savePage()` service function, so the split touches one module.                                                                                |
| **Forms + submission inbox**               | Submissions are content: they land in the content repo and surface as an inbox screen. Notification is the one place a transactional email key would earn its keep — and it would be a _form_ dependency, not an _auth_ one, so a broken key could never lock anyone out. |
| **Global content (nav, footer)**           | Falls out of the existing field-schema machinery applied to a `globals.json`.                                                                                                                                                                                             |
| **Inline click-to-edit**                   | An iframe postMessage bridge over the existing editor.                                                                                                                                                                                                                    |
| **A headless HTTP API / other frameworks** | The `ContentStore` interface is the seam. A thin route layer over it would be about a week's work — but nothing is built for it now.                                                                                                                                      |
| **Horizontal scaling**                     | Would require moving the index out of process. Not designed for; a single container is sufficient.                                                                                                                                                                        |
| **Nested layout containers**               | Would require reworking the flat section list into a tree. Deliberately not designed for; revisit only if a real client need appears.                                                                                                                                     |
