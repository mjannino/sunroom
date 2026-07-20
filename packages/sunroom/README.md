# sunroom

A git-backed CMS for Next.js (App Router). Your content lives as JSON in a git
repo; editors change it through a built-in admin panel; your app renders it as
React. There is no database and no hosted service — the package provides the
public rendering **and the entire admin UI**; you write a config and a handful
of one-line route files.

## Install

```bash
pnpm add sunroom
# peer deps: next >= 15, react >= 19
```

## 1. Define your sections

A "section" is one of your React components made editable. Declare its fields
with `f.*` and Sunroom generates the editor form for it. This config file is the
only real code you author.

```ts
// sunroom.config.ts
import { createSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";

export default createSunroom({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: {
        heading: f.text({ label: "Heading", required: true }),
        body: f.richText({ label: "Body" }),
        image: f.image({ label: "Image" }),
      },
    }),
  },
});
```

`createSunroom(...)` returns a `Sunroom` object with everything you mount below.

## 2. Mount the public site

Point a catch-all route at the render exports. Keep it in a route group (or any
layout) that holds _your_ site chrome — see the isolation note below.

```ts
// app/(site)/[[...slug]]/page.tsx
import sunroom from "@/sunroom.config";

export const generateStaticParams = sunroom.generateStaticParams;
export const generateMetadata = sunroom.generateMetadata;
export default sunroom.Page;
```

## 3. Mount the admin panel

The admin — the dark shell, sidebar, page editor, media library, everything — is
**provided by the package**. You expose it with three one-line files. You write
no admin UI.

```ts
// app/admin/layout.tsx        — the auth guard + admin shell
import sunroom from "@/sunroom.config";
export default sunroom.AdminLayout;
```

```ts
// app/admin/[[...segments]]/page.tsx   — the editor screens (pages list, per-page editor)
import sunroom from "@/sunroom.config";
export default sunroom.AdminPage;
```

```ts
// app/api/sunroom/[[...route]]/route.ts  — auth routes (login/callback/owner/logout)
import sunroom from "@/sunroom.config";
export const { GET, POST } = sunroom.handlers;
```

Why files, not a single `<Admin/>` import: Next's App Router is filesystem-routed
— a route exists because a file sits at a path in _your_ `app/` directory, and a
package can't create files there. So you re-export the package's components at the
paths you want. (The admin lives at `/admin` here; mount it wherever you like.)
The `[[...segments]]` catch-all is required — the admin has multiple internal
screens and routes them itself.

## Keep the admin isolated from your site chrome

`AdminLayout` renders a **self-contained** dark shell (its styles are scoped under
`.sr-admin` and injected inline — no stylesheet to import). But because
`app/admin/*` still nests under your **root** `app/layout.tsx`, anything your root
layout renders (a site `<nav>`, a `<main>` wrapper, global element CSS) will wrap
the admin too.

Keep your site chrome out of the root layout. The clean pattern:

```
app/
  layout.tsx            → just <html><body>{children}</body></html>
  (site)/
    layout.tsx          → your <Nav/> + <main> wrapper   (public pages only)
    [[...slug]]/page.tsx
  admin/
    layout.tsx          → sunroom.AdminLayout             (no site chrome)
    [[...segments]]/page.tsx
```

Route groups (`(site)`) don't change URLs, so `/` and `/about` still work — the
site chrome just no longer wraps `/admin`. Note that Next treats imported plain
CSS as global; if your `globals.css` has broad element selectors (`main`, `nav`),
scope them to your site to be safe.

## 4. Configure the environment

Auth, content storage, and media come from environment variables (never commit
secrets). See the demo's `AUTH.md` for the auth setup (Google OAuth + the
break-glass owner token). Summary:

| Variable                                   | Purpose                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in                                                                                       |
| `SUNROOM_SESSION_SECRET`                   | signs sessions — **≥ 32 chars** (`openssl rand -base64 32`)                                          |
| `SUNROOM_EDITORS`                          | comma-separated allowlist of editor emails                                                           |
| `SUNROOM_URL`                              | your site's public origin (required behind a proxy so redirects don't fall back to the request host) |
| `SUNROOM_CONTENT_DIR`                      | where the git content store lives                                                                    |
| `SUNROOM_SCHEMA_PATH`                      | field-schema file (place it **outside** the content dir)                                             |
| `R2_*`, `R2_PUBLIC_BASE`, `R2_PUBLIC_HOST` | Cloudflare R2 for image uploads/serving                                                              |
| `SUNROOM_OWNER_TOKEN`                      | optional break-glass login — leave unset in production                                               |

## API surface

`createSunroom(config)` returns:

| Member                                             | Use                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Page`, `generateStaticParams`, `generateMetadata` | public page rendering                                                                  |
| `getPages()`, `getPage(slug)`                      | read content in your own components (e.g. a nav)                                       |
| `AdminLayout`                                      | admin auth guard + shell (mount at `app/admin/layout.tsx`)                             |
| `AdminPage`                                        | admin editor screens (mount at `app/admin/[[...segments]]/page.tsx`)                   |
| `handlers`                                         | `{ GET, POST }` auth route handlers (mount at `app/api/sunroom/[[...route]]/route.ts`) |
| `config`                                           | the resolved config                                                                    |

Also exported from `sunroom`: `defineSection`, `f` (field builders), and store/
validation utilities for tooling.
