# Section library

Built-in, ready-to-register sections: `Gallery`, `Hero`, `Cta`. Import the
package export `sunroom/sections` (built from this directory's `index.tsx`)
rather than reaching into `src/sections/*` directly.

## Register a section

Pass the exported `*Section` definitions straight into `createSunroom`'s
`sections` map, keyed by whatever section-type name you want pages to
reference:

```ts
import { createSunroom } from "sunroom";
import { gallerySection, heroSection, ctaSection } from "sunroom/sections";

export default createSunroom({
  sections: {
    gallery: gallerySection,
    hero: heroSection,
    cta: ctaSection,
  },
});
```

Each definition bundles a `label`, a `component`, and the admin `fields`
schema together (see `index.tsx`), so registering it is enough to make the
section both renderable and editable.

## CSS is auto-injected

The library's styles (`sections-css.ts`'s `SECTIONS_CSS`) are injected once
by the server `Sections` render engine (`render/sections.tsx`) as a `<style>`
tag ahead of the rendered sections. Consumers never import a stylesheet for
this — using `gallerySection`/`heroSection`/`ctaSection` is sufficient.

## `--sr-*` token contract

Every rule reads its color/typography values through `--sr-*` custom
properties with a hard-coded fallback, so pages that define none of these
still render with sensible (dark, warm) defaults. Set the properties on
whatever ancestor wraps your rendered page (e.g. `:root` or a theme wrapper)
to restyle the sections without touching component code.

| Token             | Fallback                  | Used for                                                               |
| ----------------- | ------------------------- | ---------------------------------------------------------------------- |
| `--sr-font-label` | `ui-monospace, monospace` | Section label typography (`.srs-label`) and the CTA button font        |
| `--sr-muted`      | `#a98a7e`                 | Section label color                                                    |
| `--sr-text`       | `#f3e7e1`                 | Gallery lightbox close/nav icon color; CTA button's default background |
| `--sr-bg`         | `#181210`                 | CTA button's default text color                                        |
| `--sr-accent`     | `#ff6f52`                 | CTA button's hover background                                          |
| `--sr-on-accent`  | `#2a0f08`                 | CTA button's hover text color                                          |

## Wiring the CTA's contact action

`Cta` renders an anchor when `action: "link"` and `href` is set, and a
button otherwise. The button calls `onContact` from `SectionsProvider`'s
context when clicked:

```tsx
import { SectionsProvider } from "sunroom/sections";

<SectionsProvider onContact={() => openContactModal()}>
  {/* rendered page, including any Cta sections */}
</SectionsProvider>;
```

Without a `SectionsProvider` ancestor, the contact button still renders and
is safely clickable — `onContact` is just `undefined`, so the click is a
no-op rather than a crash.
