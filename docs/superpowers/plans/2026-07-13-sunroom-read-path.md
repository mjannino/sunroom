# Sunroom Read Path (Phases 0–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Next.js site whose pages, metadata, and section composition are all driven by a git-backed content store — the complete read path, with no admin UI yet.

**Architecture:** One npm package (`sunroom`) mounted into a Next App Router site. A typed component registry (`f.*` field builders + `defineSection`) declares which components are editable and what fields they expose. A `GitStore` holds content as JSON in a local git repo, loaded into an in-memory index at boot, with atomic write → commit saves guarded by a write lock and content-hash optimistic concurrency. `createSunroom(config)` returns the Next route exports that render a page by walking its section list and looking each type up in the registry.

**Tech Stack:** TypeScript, Next.js 15 (App Router), React 19, pnpm workspaces, Vitest, tsup. **Zero runtime dependencies** — git is invoked via `node:child_process`.

## Global Constraints

- **Zero runtime dependencies in `packages/sunroom`.** Everything is Node builtins, React, or Next (the latter two as peers). Any new runtime dependency needs an explicit decision.
- **Node 20.12+** (`Dirent.parentPath`, used in `listJsonFiles`, requires it). Development is on Node 24; CI pins Node 22.
- **Next.js App Router only.** No Pages Router, no framework abstraction layer.
- **`params` is a Promise** in Next 15 route handlers and must be awaited.
- **Reserved slugs:** `admin` and `api` may never be the first segment of a page slug.
- **The home page has slug `''`** and lives at `pages/index.json`. It cannot be deleted.
- **The store never imports the registry.** Structural validation lives in the store; field/prop validation lives in core. This boundary is what lets the store be tested with no React in sight.
- **Every file is written exactly as `JSON.stringify(value, null, 2) + '\n'`.** The content hash depends on byte-for-byte agreement between what is written and what is read back.
- **TDD.** Every task writes the failing test first, watches it fail, then implements.

## Deviations from the spec (deliberate, already agreed)

| Spec showed                                      | Plan does                                       | Why                                                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineSunroom` + `export default SunroomPage`   | `createSunroom(config)` returning route exports | The spec's form requires the package to discover `sunroom.config.ts` via a build alias. A factory taking config explicitly needs no magic.                     |
| Commit SHA for optimistic concurrency            | Content hash (sha256, 16 hex chars)             | Same guarantee, no git call on read, store correctness doesn't depend on git plumbing.                                                                         |
| `f.image()` resolves to `{url,width,height,alt}` | Stores/passes a media id string                 | Media resolution is Phase 6. Image fields are declarable now but resolve to `undefined` at render until then. The demo site in this plan uses no image fields. |

---

## File Structure

```
package.json                              root workspace
pnpm-workspace.yaml
tsconfig.base.json
.github/workflows/ci.yml

packages/sunroom/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  src/
    index.ts                public exports
    errors.ts               ValidationIssue + the three error classes (shared by core and store)
    sunroom.tsx             createSunroom() — the Next integration
    core/
      fields.ts             f.* builders, FieldDescriptor, InferFields
      registry.ts           defineSection, SunroomConfig
      validate.ts           validateProps(fields, props) — used by the admin in Phase 5
    store/
      types.ts              Page, SectionInstance, Settings, ContentStore interface
      paths.ts              slug <-> file path <-> route params, slug validation
      hash.ts               content hash
      git.ts                execFile wrapper around the git binary
      validate-page.ts      structural validation of a Page document
      git-store.ts          GitStore: boot, index, save, delete, settings
      singleton.ts          getStore(config) — memoised per content dir
    render/
      sections.tsx          <Sections> — walks the section list against the registry

examples/demo-site/                       reference site (Task 13)
```

---

## Task 1: Workspace scaffolding and CI

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`
- Create: `packages/sunroom/package.json`, `packages/sunroom/tsconfig.json`, `packages/sunroom/tsup.config.ts`, `packages/sunroom/vitest.config.ts`
- Create: `packages/sunroom/src/index.ts`
- Create: `.github/workflows/ci.yml`
- Test: `packages/sunroom/src/index.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: a `sunroom` workspace package exporting `VERSION: string`, with `pnpm test`, `pnpm typecheck`, and `pnpm build` all working.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { VERSION } from "./index.js";

describe("package", () => {
  it("exports a version string", () => {
    expect(typeof VERSION).toBe("string");
  });
});
```

- [ ] **Step 2: Create the workspace files**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

Create `package.json`:

```json
{
  "name": "sunroom-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write .",
    "lint": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "typescript": "^5.6.3"
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "noEmit": true
  }
}
```

Create `.gitignore`:

```
node_modules/
dist/
.next/
.sunroom-content/
*.tsbuildinfo
```

- [ ] **Step 3: Create the package files**

Create `packages/sunroom/package.json`:

```json
{
  "name": "sunroom",
  "version": "0.0.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "next": ">=15",
    "react": ">=19"
  },
  "devDependencies": {
    "@types/node": "^22.7.5",
    "@types/react": "^19.0.0",
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

Note the empty `dependencies` — this is a global constraint, not an oversight.

Create `packages/sunroom/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  },
  "include": ["src"]
}
```

Create `packages/sunroom/tsup.config.ts`:

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom", "next"],
});
```

Create `packages/sunroom/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Create `packages/sunroom/src/index.ts`:

```ts
export const VERSION = "0.0.0";
```

- [ ] **Step 4: Install and run the test**

Run:

```bash
pnpm install
pnpm test
```

Expected: one test file, one passing test.

- [ ] **Step 5: Add CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

The store tests shell out to `git`, which is present on `ubuntu-latest`. They pass `-c user.name` / `-c user.email` on every commit, so **no global git identity is required in CI** — that is deliberate.

- [ ] **Step 6: Verify typecheck and build pass**

Run:

```bash
pnpm typecheck && pnpm build
```

Expected: both succeed; `packages/sunroom/dist/index.js` and `index.d.ts` exist.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm workspace, sunroom package, and CI"
```

---

## Task 2: Field descriptors and type inference

**Files:**

- Create: `packages/sunroom/src/core/fields.ts`
- Test: `packages/sunroom/src/core/fields.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `f` — the builder object with `text`, `textarea`, `richText`, `link`, `image`, `number`, `boolean`, `select`, `object`, `array`.
  - `type FieldDescriptor` — the union of all descriptor shapes.
  - `type FieldMap = Record<string, FieldDescriptor>`
  - `type InferFields<M extends FieldMap>` — maps a field map to the props object a component receives. Required fields are non-optional; everything else is optional.
  - `interface ImageValue { url: string; width: number; height: number; alt?: string }`
  - `interface SelectOption { label: string; value: string }`

`InferFields` is what makes "a registered section's fields must match its component's props" a **compile-time** error rather than a runtime one. It is the load-bearing type in the package.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/core/fields.test.ts`:

```ts
import { describe, expect, expectTypeOf, it } from "vitest";
import { f } from "./fields.js";
import type { ImageValue, InferFields } from "./fields.js";

describe("f builders", () => {
  it("produces plain serializable descriptors", () => {
    expect(f.text({ label: "Heading", required: true })).toEqual({
      type: "text",
      label: "Heading",
      required: true,
    });
    expect(f.number()).toEqual({ type: "number" });
    expect(f.select({ options: [{ label: "A", value: "a" }] })).toEqual({
      type: "select",
      options: [{ label: "A", value: "a" }],
    });
  });

  it("nests object and array descriptors", () => {
    const d = f.array(f.object({ quote: f.text(), author: f.text() }));
    expect(d).toEqual({
      type: "array",
      of: {
        type: "object",
        fields: { quote: { type: "text" }, author: { type: "text" } },
      },
    });
  });

  it("survives a JSON round trip", () => {
    const d = f.object({ label: f.text({ required: true }), href: f.link() });
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });
});

describe("InferFields", () => {
  it("maps field types to prop types, honouring required", () => {
    const fields = {
      heading: f.text({ required: true }),
      body: f.richText(),
      count: f.number(),
      flag: f.boolean(),
      photo: f.image(),
      cta: f.object({ label: f.text(), href: f.link() }),
      quotes: f.array(f.object({ quote: f.text() })),
    };
    type Props = InferFields<typeof fields>;

    expectTypeOf<Props["heading"]>().toEqualTypeOf<string>();
    expectTypeOf<Props["body"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Props["count"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Props["flag"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Props["photo"]>().toEqualTypeOf<ImageValue | undefined>();
    expectTypeOf<Props["quotes"]>().toEqualTypeOf<
      { quote?: string }[] | undefined
    >();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './fields.js'`.

- [ ] **Step 3: Implement `fields.ts`**

Create `packages/sunroom/src/core/fields.ts`:

```ts
export interface SelectOption {
  label: string;
  value: string;
}

/** What a component receives for an `f.image()` field, once Phase 6 resolves it. */
export interface ImageValue {
  url: string;
  width: number;
  height: number;
  alt?: string;
}

interface Base {
  label?: string;
  required?: boolean;
}

type TextOpts = Base & { default?: string };
type NumberOpts = Base & { default?: number };
type BooleanOpts = Base & { default?: boolean };
type SelectOpts = Base & { options: SelectOption[]; default?: string };

export type FieldDescriptor =
  | ({ type: "text" } & TextOpts)
  | ({ type: "textarea" } & TextOpts)
  | ({ type: "richText" } & TextOpts)
  | ({ type: "link" } & TextOpts)
  | ({ type: "image" } & Base)
  | ({ type: "number" } & NumberOpts)
  | ({ type: "boolean" } & BooleanOpts)
  | ({ type: "select" } & SelectOpts)
  | ({ type: "object"; fields: FieldMap } & Base)
  | ({ type: "array"; of: FieldDescriptor } & Base);

export type FieldMap = Record<string, FieldDescriptor>;

const empty = {} as never;

export const f = {
  text: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "text", ...(o ?? empty) }) as { type: "text" } & O,
  textarea: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "textarea", ...(o ?? empty) }) as { type: "textarea" } & O,
  richText: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "richText", ...(o ?? empty) }) as { type: "richText" } & O,
  link: <const O extends TextOpts = Record<string, never>>(o?: O) =>
    ({ type: "link", ...(o ?? empty) }) as { type: "link" } & O,
  image: <const O extends Base = Record<string, never>>(o?: O) =>
    ({ type: "image", ...(o ?? empty) }) as { type: "image" } & O,
  number: <const O extends NumberOpts = Record<string, never>>(o?: O) =>
    ({ type: "number", ...(o ?? empty) }) as { type: "number" } & O,
  boolean: <const O extends BooleanOpts = Record<string, never>>(o?: O) =>
    ({ type: "boolean", ...(o ?? empty) }) as { type: "boolean" } & O,
  select: <const O extends SelectOpts>(o: O) =>
    ({ type: "select", ...o }) as { type: "select" } & O,
  object: <
    const M extends FieldMap,
    const O extends Base = Record<string, never>,
  >(
    fields: M,
    o?: O,
  ) =>
    ({ type: "object", fields, ...(o ?? empty) }) as {
      type: "object";
      fields: M;
    } & O,
  array: <
    const I extends FieldDescriptor,
    const O extends Base = Record<string, never>,
  >(
    of: I,
    o?: O,
  ) => ({ type: "array", of, ...(o ?? empty) }) as { type: "array"; of: I } & O,
};

type ValueOf<F> = F extends {
  type: "text" | "textarea" | "richText" | "link" | "select";
}
  ? string
  : F extends { type: "number" }
    ? number
    : F extends { type: "boolean" }
      ? boolean
      : F extends { type: "image" }
        ? ImageValue
        : F extends { type: "object"; fields: infer M }
          ? M extends FieldMap
            ? InferFields<M>
            : never
          : F extends { type: "array"; of: infer I }
            ? ValueOf<I>[]
            : never;

type RequiredKeys<M> = {
  [K in keyof M]: M[K] extends { required: true } ? K : never;
}[keyof M];

type OptionalKeys<M> = Exclude<keyof M, RequiredKeys<M>>;

export type InferFields<M extends FieldMap> = {
  [K in RequiredKeys<M>]: ValueOf<M[K]>;
} & {
  [K in OptionalKeys<M>]?: ValueOf<M[K]>;
};
```

Every builder has the same shape: spread the options, assert the literal type back. The `const` type
parameters are what preserve `required: true` as the literal `true` rather than widening it to `boolean` —
without them, `RequiredKeys` cannot tell a required field from an optional one and every prop becomes
optional.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS. The `expectTypeOf` assertions are checked by `typecheck`, so **both commands must pass** — a green `test` alone proves nothing about the types.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/core/fields.ts packages/sunroom/src/core/fields.test.ts
git commit -m "feat(core): field descriptors and prop type inference"
```

---

## Task 3: The component registry

**Files:**

- Create: `packages/sunroom/src/core/registry.ts`
- Test: `packages/sunroom/src/core/registry.test.tsx`

**Interfaces:**

- Consumes: `FieldMap`, `InferFields` from `core/fields.ts`.
- Produces:
  - `defineSection<M extends FieldMap>(def)` — where `def.component` is typed `ComponentType<InferFields<M>>`, so a mismatch between fields and props is a **compile error**.
  - `interface SectionDefinition` — `{ label, component, fields, thumbnail?, deprecated? }`
  - `interface SunroomInput` — `{ contentDir?: string; sections: Record<string, SectionDefinition> }`
  - `interface SunroomConfig` — same, with `contentDir` resolved to a definite `string`.
  - `resolveConfig(input: SunroomInput): SunroomConfig`

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/core/registry.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { f } from "./fields.js";
import { defineSection, resolveConfig } from "./registry.js";

function Hero({ heading, body }: { heading: string; body?: string }) {
  return (
    <section>
      <h1>{heading}</h1>
      {body ? <p>{body}</p> : null}
    </section>
  );
}

describe("defineSection", () => {
  it("returns the definition unchanged", () => {
    const def = defineSection({
      label: "Hero",
      component: Hero,
      fields: { heading: f.text({ required: true }), body: f.richText() },
    });
    expect(def.label).toBe("Hero");
    expect(def.fields.heading).toEqual({ type: "text", required: true });
    expect(def.component).toBe(Hero);
    expect(def.deprecated).toBeUndefined();
  });
});

describe("resolveConfig", () => {
  it("defaults contentDir when not supplied", () => {
    const config = resolveConfig({ sections: {} });
    expect(config.contentDir).toBe("./.sunroom-content");
  });

  it("honours an explicit contentDir", () => {
    const config = resolveConfig({ contentDir: "/data/content", sections: {} });
    expect(config.contentDir).toBe("/data/content");
  });

  it("reads SUNROOM_CONTENT_DIR from the environment", () => {
    const prev = process.env.SUNROOM_CONTENT_DIR;
    process.env.SUNROOM_CONTENT_DIR = "/env/content";
    try {
      expect(resolveConfig({ sections: {} }).contentDir).toBe("/env/content");
    } finally {
      if (prev === undefined) delete process.env.SUNROOM_CONTENT_DIR;
      else process.env.SUNROOM_CONTENT_DIR = prev;
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './registry.js'`.

- [ ] **Step 3: Implement `registry.ts`**

Create `packages/sunroom/src/core/registry.ts`:

```ts
import type { ComponentType } from "react";
import type { FieldMap, InferFields } from "./fields.js";

export interface SectionDefinition<M extends FieldMap = FieldMap> {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  fields: M;
  /** Public path to a preview image shown in the client's Add Section palette. */
  thumbnail?: string;
  /** Hidden from the palette, but existing instances still render. See spec §7. */
  deprecated?: boolean;
}

/**
 * Registers a component as an editable section.
 *
 * `component` is typed as `ComponentType<InferFields<M>>`, so if the component's
 * props and the declared fields disagree, this is a compile error — not a
 * runtime surprise on a client's live page.
 */
export function defineSection<const M extends FieldMap>(def: {
  label: string;
  fields: M;
  component: ComponentType<InferFields<M>>;
  thumbnail?: string;
  deprecated?: boolean;
}): SectionDefinition<M> {
  return def as unknown as SectionDefinition<M>;
}

export interface SunroomInput {
  /** Defaults to $SUNROOM_CONTENT_DIR, then './.sunroom-content'. */
  contentDir?: string;
  sections: Record<string, SectionDefinition<FieldMap>>;
}

export interface SunroomConfig {
  contentDir: string;
  sections: Record<string, SectionDefinition<FieldMap>>;
}

export const DEFAULT_CONTENT_DIR = "./.sunroom-content";

export function resolveConfig(input: SunroomInput): SunroomConfig {
  return {
    contentDir:
      input.contentDir ??
      process.env.SUNROOM_CONTENT_DIR ??
      DEFAULT_CONTENT_DIR,
    sections: input.sections,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS.

- [ ] **Step 5: Prove the type-level guard actually fires**

Temporarily add this to `registry.test.tsx` and confirm `pnpm --filter sunroom typecheck` **fails**:

```tsx
// @ts-expect-error Hero requires `heading: string` but no such field is declared
defineSection({
  label: "Broken",
  component: Hero,
  fields: { body: f.richText() },
});
```

Because it is marked `@ts-expect-error`, a **passing** typecheck means the guard fired correctly. If typecheck reports "unused @ts-expect-error", the guard is NOT working — fix `InferFields` before continuing. Leave this assertion in the test file permanently; it is a regression test for the single most important type in the package.

- [ ] **Step 6: Commit**

```bash
git add packages/sunroom/src/core/registry.ts packages/sunroom/src/core/registry.test.tsx
git commit -m "feat(core): section registry with compile-time props/fields checking"
```

---

## Task 4: Prop validation

**Files:**

- Create: `packages/sunroom/src/errors.ts`
- Create: `packages/sunroom/src/core/validate.ts`
- Test: `packages/sunroom/src/core/validate.test.ts`

**Interfaces:**

- Consumes: `FieldMap` from `core/fields.ts`.
- Produces:
  - `interface ValidationIssue { path: string; message: string }` (from `errors.ts`)
  - `class ValidationError extends Error { issues: ValidationIssue[] }`
  - `class ConflictError extends Error { slug: string }`
  - `class NotFoundError extends Error { slug: string }`
  - `validateProps(fields: FieldMap, props: unknown): ValidationIssue[]` — empty array means valid.

`validateProps` is consumed by the admin in Phase 5; it is built now because it belongs with the field system. **Unknown keys in `props` are NOT an error** — spec §7 requires that a renamed field's old data survives rather than being deleted. `sunroom check` reports them in Phase 7.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/core/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { f } from "./fields.js";
import { validateProps } from "./validate.js";

describe("validateProps", () => {
  it("accepts valid props", () => {
    const fields = { heading: f.text({ required: true }), count: f.number() };
    expect(validateProps(fields, { heading: "Hi", count: 3 })).toEqual([]);
  });

  it("rejects a missing required field", () => {
    const fields = { heading: f.text({ required: true }) };
    expect(validateProps(fields, {})).toEqual([
      { path: "heading", message: "is required" },
    ]);
  });

  it("allows a missing optional field", () => {
    expect(validateProps({ body: f.richText() }, {})).toEqual([]);
  });

  it("rejects a wrong scalar type", () => {
    expect(validateProps({ count: f.number() }, { count: "three" })).toEqual([
      { path: "count", message: "expected a number" },
    ]);
  });

  it("rejects a select value outside its options", () => {
    const fields = {
      size: f.select({ options: [{ label: "Large", value: "lg" }] }),
    };
    expect(validateProps(fields, { size: "xl" })).toEqual([
      { path: "size", message: "expected one of: lg" },
    ]);
  });

  it("reports nested paths inside objects", () => {
    const fields = { cta: f.object({ href: f.link({ required: true }) }) };
    expect(validateProps(fields, { cta: {} })).toEqual([
      { path: "cta.href", message: "is required" },
    ]);
  });

  it("reports indexed paths inside arrays", () => {
    const fields = {
      quotes: f.array(f.object({ quote: f.text({ required: true }) })),
    };
    expect(validateProps(fields, { quotes: [{ quote: "a" }, {}] })).toEqual([
      { path: "quotes[1].quote", message: "is required" },
    ]);
  });

  it("rejects a non-array for an array field", () => {
    expect(
      validateProps({ quotes: f.array(f.text()) }, { quotes: "nope" }),
    ).toEqual([{ path: "quotes", message: "expected an array" }]);
  });

  it("ignores unknown keys so a renamed field does not destroy content", () => {
    expect(
      validateProps({ title: f.text() }, { title: "a", heading: "old value" }),
    ).toEqual([]);
  });

  it("rejects props that are not an object", () => {
    expect(validateProps({ a: f.text() }, null)).toEqual([
      { path: "", message: "expected an object" },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './validate.js'`.

- [ ] **Step 3: Implement `errors.ts`**

Create `packages/sunroom/src/errors.ts`:

```ts
export interface ValidationIssue {
  /** Dotted path to the offending value, e.g. `quotes[1].quote`. Empty for the root. */
  path: string;
  message: string;
}

export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(
      issues
        .map((i) => (i.path ? `${i.path}: ${i.message}` : i.message))
        .join("; "),
    );
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/** The page changed underneath the editor. See spec §7, concurrency. */
export class ConflictError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(
      `Page "${slug || "home"}" was changed by someone else. Reload and try again.`,
    );
    this.name = "ConflictError";
    this.slug = slug;
  }
}

export class NotFoundError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(`Page "${slug || "home"}" does not exist.`);
    this.name = "NotFoundError";
    this.slug = slug;
  }
}
```

- [ ] **Step 4: Implement `validate.ts`**

Create `packages/sunroom/src/core/validate.ts`:

```ts
import type { ValidationIssue } from "../errors.js";
import type { FieldDescriptor, FieldMap } from "./fields.js";

const STRING_TYPES = new Set(["text", "textarea", "richText", "link", "image"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateField(
  field: FieldDescriptor,
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (STRING_TYPES.has(field.type)) {
    if (typeof value !== "string")
      issues.push({ path, message: "expected a string" });
    return;
  }

  switch (field.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push({ path, message: "expected a number" });
      }
      return;

    case "boolean":
      if (typeof value !== "boolean")
        issues.push({ path, message: "expected a boolean" });
      return;

    case "select": {
      const allowed = field.options.map((o) => o.value);
      if (typeof value !== "string" || !allowed.includes(value)) {
        issues.push({
          path,
          message: `expected one of: ${allowed.join(", ")}`,
        });
      }
      return;
    }

    case "object":
      if (!isPlainObject(value)) {
        issues.push({ path, message: "expected an object" });
        return;
      }
      walk(field.fields, value, path, issues);
      return;

    case "array":
      if (!Array.isArray(value)) {
        issues.push({ path, message: "expected an array" });
        return;
      }
      value.forEach((item, i) =>
        validateField(field.of, item, `${path}[${i}]`, issues),
      );
      return;
  }
}

function walk(
  fields: FieldMap,
  props: Record<string, unknown>,
  prefix: string,
  issues: ValidationIssue[],
): void {
  for (const [key, field] of Object.entries(fields)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = props[key];

    if (value === undefined || value === null) {
      if (field.required) issues.push({ path, message: "is required" });
      continue;
    }

    validateField(field, value, path, issues);
  }
  // Unknown keys are deliberately ignored: spec §7 requires that renaming a
  // field preserves the old data rather than deleting it. `sunroom check`
  // surfaces them in CI (Phase 7).
}

/** Returns an empty array when `props` is valid against `fields`. */
export function validateProps(
  fields: FieldMap,
  props: unknown,
): ValidationIssue[] {
  if (!isPlainObject(props))
    return [{ path: "", message: "expected an object" }];
  const issues: ValidationIssue[] = [];
  walk(fields, props, "", issues);
  return issues;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS, 10 tests in `validate.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add packages/sunroom/src/errors.ts packages/sunroom/src/core/validate.ts packages/sunroom/src/core/validate.test.ts
git commit -m "feat(core): prop validation against field schemas"
```

---

## Task 5: Store types and slug/path mapping

**Files:**

- Create: `packages/sunroom/src/store/types.ts`
- Create: `packages/sunroom/src/store/paths.ts`
- Create: `packages/sunroom/src/store/hash.ts`
- Test: `packages/sunroom/src/store/paths.test.ts`

**Interfaces:**

- Consumes: `ValidationIssue` from `errors.ts`.
- Produces (from `types.ts`):
  - `interface SectionInstance { id: string; type: string; props: Record<string, unknown> }`
  - `interface PageSeo { title?: string; description?: string; ogImage?: string }`
  - `interface Page { slug: string; title: string; position: number; seo: PageSeo; sections: SectionInstance[] }`
  - `interface PageSummary { slug: string; title: string; position: number }`
  - `interface PageEntry { page: Page; version: string }`
  - `interface Settings { seoDefaults: { titleTemplate?: string; description?: string }; redirects: { from: string; to: string }[] }`
  - `interface Author { name: string; email: string }`
  - `interface ContentStore` — the full interface (see code).
  - `const DEFAULT_SETTINGS: Settings`
- Produces (from `paths.ts`): `RESERVED_SLUGS`, `validateSlug`, `slugToPath`, `pathToSlug`, `paramsToSlug`, `slugToParams`.
- Produces (from `hash.ts`): `contentVersion(text: string): string`.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/store/paths.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contentVersion } from "./hash.js";
import {
  paramsToSlug,
  pathToSlug,
  slugToParams,
  slugToPath,
  validateSlug,
} from "./paths.js";

describe("slugToPath", () => {
  it("maps the home slug to pages/index.json", () => {
    expect(slugToPath("")).toBe("pages/index.json");
  });

  it("maps a simple slug", () => {
    expect(slugToPath("about")).toBe("pages/about.json");
  });

  it("mirrors nested slugs as nested paths", () => {
    expect(slugToPath("services/pricing")).toBe("pages/services/pricing.json");
  });
});

describe("pathToSlug", () => {
  it("round-trips every slugToPath result", () => {
    for (const slug of ["", "about", "services/pricing"]) {
      expect(pathToSlug(slugToPath(slug))).toBe(slug);
    }
  });
});

describe("params mapping", () => {
  it("treats an absent catch-all param as the home page", () => {
    expect(paramsToSlug(undefined)).toBe("");
    expect(paramsToSlug([])).toBe("");
  });

  it("joins segments", () => {
    expect(paramsToSlug(["services", "pricing"])).toBe("services/pricing");
  });

  it("round-trips", () => {
    for (const slug of ["", "about", "services/pricing"]) {
      expect(paramsToSlug(slugToParams(slug))).toBe(slug);
    }
  });
});

describe("validateSlug", () => {
  it("accepts the home slug", () => {
    expect(validateSlug("")).toEqual([]);
  });

  it("accepts kebab-case segments", () => {
    expect(validateSlug("about-us")).toEqual([]);
    expect(validateSlug("services/web-design")).toEqual([]);
  });

  it("rejects reserved first segments so a client cannot shadow their own CMS", () => {
    expect(validateSlug("admin")).toEqual([
      { path: "slug", message: '"admin" is a reserved slug' },
    ]);
    expect(validateSlug("api/things")).toEqual([
      { path: "slug", message: '"api" is a reserved slug' },
    ]);
  });

  it("rejects uppercase, spaces, and path traversal", () => {
    expect(validateSlug("About")).toHaveLength(1);
    expect(validateSlug("two words")).toHaveLength(1);
    expect(validateSlug("../etc/passwd")).not.toEqual([]);
    expect(validateSlug("a//b")).not.toEqual([]);
  });
});

describe("contentVersion", () => {
  it("is stable and differs on change", () => {
    expect(contentVersion("a")).toBe(contentVersion("a"));
    expect(contentVersion("a")).not.toBe(contentVersion("b"));
    expect(contentVersion("a")).toHaveLength(16);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './hash.js'`.

- [ ] **Step 3: Implement `hash.ts`**

Create `packages/sunroom/src/store/hash.ts`:

```ts
import { createHash } from "node:crypto";

/**
 * The optimistic-concurrency token for a page: a hash of its exact file bytes.
 *
 * A content hash rather than a git SHA, so reads need no git call and the
 * store's correctness does not depend on git plumbing.
 */
export function contentVersion(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}
```

- [ ] **Step 4: Implement `paths.ts`**

Create `packages/sunroom/src/store/paths.ts`:

```ts
import type { ValidationIssue } from "../errors.js";

/** A page may never take these, or a client could shadow their own CMS. */
export const RESERVED_SLUGS = new Set(["admin", "api"]);

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The home page. Lives at `pages/index.json`; cannot be deleted. */
export const HOME_SLUG = "";

export function validateSlug(slug: string): ValidationIssue[] {
  if (slug === HOME_SLUG) return [];

  const issues: ValidationIssue[] = [];
  const segments = slug.split("/");
  const first = segments[0];

  if (first !== undefined && RESERVED_SLUGS.has(first)) {
    issues.push({ path: "slug", message: `"${first}" is a reserved slug` });
    return issues;
  }

  for (const segment of segments) {
    if (!SEGMENT.test(segment)) {
      issues.push({
        path: "slug",
        message: `"${segment}" is not a valid slug segment (lowercase letters, numbers, and hyphens)`,
      });
    }
  }

  return issues;
}

export function slugToPath(slug: string): string {
  return slug === HOME_SLUG ? "pages/index.json" : `pages/${slug}.json`;
}

export function pathToSlug(path: string): string {
  const rel = path.replace(/^pages\//, "").replace(/\.json$/, "");
  return rel === "index" ? HOME_SLUG : rel;
}

/** Next's catch-all param -> a slug. `undefined` and `[]` both mean the home page. */
export function paramsToSlug(segments: string[] | undefined): string {
  return (segments ?? []).join("/");
}

export function slugToParams(slug: string): string[] {
  return slug === HOME_SLUG ? [] : slug.split("/");
}
```

Path traversal (`../etc/passwd`) is rejected because `..` fails the `SEGMENT` regex, and `a//b` is rejected because the empty segment fails it too. **These are the security-relevant cases** — `slugToPath` is used to build a filesystem path, so an unvalidated slug would be an arbitrary-write primitive. `validateSlug` is called on every save (Task 8).

- [ ] **Step 5: Implement `types.ts`**

Create `packages/sunroom/src/store/types.ts`:

```ts
export interface SectionInstance {
  /** Stable across edits; used as the React key and the drag-reorder identity. */
  id: string;
  /** A key in `SunroomConfig.sections`. */
  type: string;
  props: Record<string, unknown>;
}

export interface PageSeo {
  title?: string;
  description?: string;
  /** A media id. Resolved to a URL in Phase 6. */
  ogImage?: string;
}

export interface Page {
  /** `''` is the home page. */
  slug: string;
  title: string;
  /** Drives nav ordering via `getPages()`. */
  position: number;
  seo: PageSeo;
  sections: SectionInstance[];
}

export interface PageSummary {
  slug: string;
  title: string;
  position: number;
}

export interface PageEntry {
  page: Page;
  /** Optimistic-concurrency token. Pass back as `baseVersion` on save. */
  version: string;
}

export interface Settings {
  seoDefaults: {
    titleTemplate?: string;
    description?: string;
  };
  /** Written automatically when a slug is renamed (Phase 7). */
  redirects: { from: string; to: string }[];
}

export interface Author {
  name: string;
  email: string;
}

export interface SaveOptions {
  /** The version the editor loaded. `null` when creating a new page. */
  baseVersion: string | null;
  author: Author;
}

export interface ContentStore {
  /** Idempotent. Creates the repo if absent, discards any crashed-save debris, loads the index. */
  init(): Promise<void>;
  listPages(): PageSummary[];
  getPage(slug: string): PageEntry | null;
  savePage(page: Page, options: SaveOptions): Promise<PageEntry>;
  deletePage(
    slug: string,
    options: { baseVersion: string; author: Author },
  ): Promise<void>;
  getSettings(): Settings;
  saveSettings(settings: Settings, options: { author: Author }): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  seoDefaults: {},
  redirects: [],
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/sunroom/src/store/
git commit -m "feat(store): content types, slug/path mapping, content hashing"
```

---

## Task 6: The git wrapper

**Files:**

- Create: `packages/sunroom/src/store/git.ts`
- Test: `packages/sunroom/src/store/git.test.ts`

**Interfaces:**

- Consumes: `Author` from `store/types.ts`.
- Produces:
  - `git(cwd: string, args: string[]): Promise<string>` — runs the git binary, returns trimmed stdout, throws on non-zero exit.
  - `commitArgs(author: Author, message: string): string[]` — a full argv for a commit carrying the author identity.
  - `hasCommits(cwd: string): Promise<boolean>`

No `simple-git`, no `isomorphic-git`. The global constraint is zero runtime dependencies, and this wrapper is thirty lines.

Identity is passed per-command via `-c user.name` / `-c user.email` rather than `git config`, so the store **never mutates global or repo git config** and tests need no git identity set up. This is what makes CI work on a bare `ubuntu-latest`.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/store/git.test.ts`:

```ts
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commitArgs, git, hasCommits } from "./git.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-git-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("git", () => {
  it("runs a command and returns trimmed stdout", async () => {
    await git(dir, ["init", "-b", "main"]);
    expect(await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("main");
  });

  it("throws on a failing command", async () => {
    await expect(git(dir, ["rev-parse", "HEAD"])).rejects.toThrow();
  });
});

describe("hasCommits", () => {
  it("is false for a fresh repo and true after a commit", async () => {
    await git(dir, ["init", "-b", "main"]);
    expect(await hasCommits(dir)).toBe(false);

    await writeFile(join(dir, "a.txt"), "hello\n");
    await git(dir, ["add", "-A"]);
    await git(
      dir,
      commitArgs({ name: "Test", email: "test@example.com" }, "first"),
    );

    expect(await hasCommits(dir)).toBe(true);
  });
});

describe("commitArgs", () => {
  it("records the author identity without touching git config", async () => {
    await git(dir, ["init", "-b", "main"]);
    await writeFile(join(dir, "a.txt"), "hello\n");
    await git(dir, ["add", "-A"]);
    await git(
      dir,
      commitArgs({ name: "Jane Doe", email: "jane@acme.com" }, "Update home"),
    );

    expect(await git(dir, ["log", "-1", "--format=%an <%ae>"])).toBe(
      "Jane Doe <jane@acme.com>",
    );
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Update home");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './git.js'`.

- [ ] **Step 3: Implement `git.ts`**

Create `packages/sunroom/src/store/git.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Author } from "./types.js";

const run = promisify(execFile);

/**
 * Runs the git binary in `cwd`. Throws on a non-zero exit.
 *
 * Arguments are passed as an argv array — never interpolated into a shell
 * string — so a page title containing a quote or a semicolon cannot become
 * a command.
 */
export async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, {
    cwd,
    maxBuffer: 32 * 1024 * 1024,
    // Keep the caller's environment out of git's way, and make output stable.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
  });
  return stdout.trim();
}

/**
 * A full commit argv carrying the author identity.
 *
 * Identity is supplied per-command with `-c`, so the store never writes to
 * global or repo git config — and CI needs no `git config user.email`.
 */
export function commitArgs(author: Author, message: string): string[] {
  return [
    "-c",
    `user.name=${author.name}`,
    "-c",
    `user.email=${author.email}`,
    "commit",
    "--allow-empty",
    "-m",
    message,
  ];
}

export async function hasCommits(cwd: string): Promise<boolean> {
  try {
    await git(cwd, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test`
Expected: PASS, 4 tests in `git.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/store/git.ts packages/sunroom/src/store/git.test.ts
git commit -m "feat(store): dependency-free git wrapper"
```

---

## Task 7: GitStore — boot, recovery, and the in-memory index

**Files:**

- Create: `packages/sunroom/src/store/validate-page.ts`
- Create: `packages/sunroom/src/store/git-store.ts`
- Test: `packages/sunroom/src/store/git-store.test.ts`

**Interfaces:**

- Consumes: `git`, `commitArgs`, `hasCommits`; `contentVersion`; `slugToPath`, `pathToSlug`, `validateSlug`; `Page`, `PageEntry`, `PageSummary`, `Settings`, `DEFAULT_SETTINGS`, `ContentStore`, `Author`; `ValidationError`.
- Produces:
  - `class GitStore implements ContentStore` with `init()`, `listPages()`, `getPage()`, `getSettings()` working. `savePage`, `deletePage`, `saveSettings` arrive in Tasks 8 and 9.
  - `validatePageShape(page: Page): ValidationIssue[]` — structural only. **Does not know about the registry** (global constraint).
  - `const SYSTEM_AUTHOR: Author`

This is the component trusted least on faith, so it is tested hardest. Boot resolution (spec §5) has four paths; **only the two local ones are built here** — an existing repo, and `git init` on an empty volume. The R2-bundle and snapshot paths depend on machinery that does not exist until Phases 6 and 7, and are added there.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/store/git-store.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { git } from "./git.js";
import { GitStore } from "./git-store.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function freshStore(): Promise<GitStore> {
  const store = new GitStore(dir);
  await store.init();
  return store;
}

describe("init on an empty directory", () => {
  it("creates a repo with a home page and settings", async () => {
    const store = await freshStore();

    expect(await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("main");
    expect(store.listPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
    ]);
    expect(store.getSettings()).toEqual({ seoDefaults: {}, redirects: [] });

    const home = store.getPage("");
    expect(home?.page.sections).toEqual([]);
    expect(home?.version).toHaveLength(16);
  });

  it("leaves a clean working tree", async () => {
    await freshStore();
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
  });

  it("is idempotent", async () => {
    await freshStore();
    const before = await git(dir, ["rev-parse", "HEAD"]);
    await freshStore();
    expect(await git(dir, ["rev-parse", "HEAD"])).toBe(before);
  });
});

describe("init on an existing repo", () => {
  it("loads pages from disk into the index", async () => {
    await freshStore();

    const about = {
      slug: "about",
      title: "About Us",
      position: 1,
      seo: {},
      sections: [{ id: "sec_1", type: "hero", props: { heading: "Hi" } }],
    };
    await writeFile(
      join(dir, "pages", "about.json"),
      JSON.stringify(about, null, 2) + "\n",
    );
    await git(dir, ["add", "-A"]);
    await git(dir, [
      "-c",
      "user.name=T",
      "-c",
      "user.email=t@e.com",
      "commit",
      "-m",
      "add about",
    ]);

    const store = await freshStore();
    expect(store.listPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
      { slug: "about", title: "About Us", position: 1 },
    ]);
    expect(store.getPage("about")?.page.sections[0]?.props).toEqual({
      heading: "Hi",
    });
  });

  it("sorts pages by position, then slug", async () => {
    const store = await freshStore();
    await store.savePage(
      { slug: "zebra", title: "Z", position: 1, seo: {}, sections: [] },
      { baseVersion: null, author: { name: "T", email: "t@e.com" } },
    );
    await store.savePage(
      { slug: "apple", title: "A", position: 1, seo: {}, sections: [] },
      { baseVersion: null, author: { name: "T", email: "t@e.com" } },
    );
    expect(store.listPages().map((p) => p.slug)).toEqual([
      "",
      "apple",
      "zebra",
    ]);
  });
});

describe("recovery from a crashed save", () => {
  it("discards uncommitted debris in the working tree on boot", async () => {
    await freshStore();

    // Simulate a process killed between writing the file and committing it.
    await writeFile(join(dir, "pages", "ghost.json"), '{"slug":"ghost"}\n');
    await writeFile(join(dir, "pages", "index.json"), '{"corrupt": true}\n');
    await writeFile(join(dir, "pages", "about.json.tmp-123-456"), "garbage");

    const store = await freshStore();

    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(store.listPages().map((p) => p.slug)).toEqual([""]);
    expect(store.getPage("")?.page.title).toBe("Home");

    const home = await readFile(join(dir, "pages", "index.json"), "utf8");
    expect(JSON.parse(home).title).toBe("Home");
  });
});

describe("getPage", () => {
  it("returns null for an unknown slug", async () => {
    const store = await freshStore();
    expect(store.getPage("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './git-store.js'`.

- [ ] **Step 3: Implement `validate-page.ts`**

Create `packages/sunroom/src/store/validate-page.ts`:

```ts
import type { ValidationIssue } from "../errors.js";
import { validateSlug } from "./paths.js";
import type { Page } from "./types.js";

/**
 * Structural validation of a page document.
 *
 * Deliberately knows nothing about the component registry — the store must be
 * testable with no React in sight. Field-level validation of section props is
 * `validateProps` in core, called by the admin before it ever reaches here.
 */
export function validatePageShape(page: Page): ValidationIssue[] {
  const issues: ValidationIssue[] = [...validateSlug(page.slug)];

  if (typeof page.title !== "string" || page.title.trim() === "") {
    issues.push({ path: "title", message: "is required" });
  }

  if (typeof page.position !== "number" || !Number.isFinite(page.position)) {
    issues.push({ path: "position", message: "expected a number" });
  }

  if (!Array.isArray(page.sections)) {
    issues.push({ path: "sections", message: "expected an array" });
    return issues;
  }

  const seen = new Set<string>();
  page.sections.forEach((section, i) => {
    if (typeof section.id !== "string" || section.id === "") {
      issues.push({ path: `sections[${i}].id`, message: "is required" });
    } else if (seen.has(section.id)) {
      issues.push({
        path: `sections[${i}].id`,
        message: `duplicate id "${section.id}"`,
      });
    } else {
      seen.add(section.id);
    }

    if (typeof section.type !== "string" || section.type === "") {
      issues.push({ path: `sections[${i}].type`, message: "is required" });
    }

    if (
      typeof section.props !== "object" ||
      section.props === null ||
      Array.isArray(section.props)
    ) {
      issues.push({
        path: `sections[${i}].props`,
        message: "expected an object",
      });
    }
  });

  return issues;
}
```

- [ ] **Step 4: Implement `git-store.ts` (boot half)**

Create `packages/sunroom/src/store/git-store.ts`:

```ts
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, sep } from "node:path";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { commitArgs, git, hasCommits } from "./git.js";
import { contentVersion } from "./hash.js";
import { HOME_SLUG, pathToSlug, slugToPath } from "./paths.js";
import type {
  Author,
  ContentStore,
  Page,
  PageEntry,
  PageSummary,
  SaveOptions,
  Settings,
} from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { validatePageShape } from "./validate-page.js";

export const SYSTEM_AUTHOR: Author = {
  name: "Sunroom",
  email: "sunroom@localhost",
};

/** Every file is written exactly like this. The content hash depends on it. */
function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

async function writeAtomic(path: string, data: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmp, data, "utf8");
  await rename(tmp, path);
}

async function listJsonFiles(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => join(e.parentPath, e.name));
}

export class GitStore implements ContentStore {
  private readonly dir: string;
  private pages = new Map<string, PageEntry>();
  private settings: Settings = DEFAULT_SETTINGS;
  /** Serialises writes. Concurrent saves queue instead of clobbering. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(dir: string) {
    this.dir = dir;
  }

  async init(): Promise<void> {
    await this.ensureRepo();
    await this.recover();
    await this.load();
  }

  /** Boot path 1 (existing repo) and path 4 (git init an empty site). */
  private async ensureRepo(): Promise<void> {
    await mkdir(join(this.dir, "pages"), { recursive: true });

    if (!existsSync(join(this.dir, ".git"))) {
      await git(this.dir, ["init", "-b", "main"]);
    }

    if (!(await hasCommits(this.dir))) {
      const home: Page = {
        slug: HOME_SLUG,
        title: "Home",
        position: 0,
        seo: {},
        sections: [],
      };
      await writeFile(
        join(this.dir, "settings.json"),
        serialize(DEFAULT_SETTINGS),
        "utf8",
      );
      await writeFile(
        join(this.dir, "pages", "index.json"),
        serialize(home),
        "utf8",
      );
      await git(this.dir, ["add", "-A"]);
      await git(
        this.dir,
        commitArgs(SYSTEM_AUTHOR, "Initialize Sunroom content"),
      );
    }
  }

  /**
   * The working copy is never trusted across a save boundary. Anything
   * uncommitted is debris from a crashed save, and is discarded — including
   * stray `.tmp-*` files, which `git clean -fd` removes because they are
   * untracked.
   */
  private async recover(): Promise<void> {
    await git(this.dir, ["reset", "--hard", "HEAD"]);
    await git(this.dir, ["clean", "-fd"]);
  }

  private async load(): Promise<void> {
    const pages = new Map<string, PageEntry>();

    for (const file of await listJsonFiles(join(this.dir, "pages"))) {
      const raw = await readFile(file, "utf8");
      const page = JSON.parse(raw) as Page;
      const rel = relative(this.dir, file).split(sep).join(posix.sep);
      const slug = pathToSlug(rel);
      pages.set(slug, {
        page: { ...page, slug },
        version: contentVersion(raw),
      });
    }

    this.pages = pages;
    this.settings = JSON.parse(
      await readFile(join(this.dir, "settings.json"), "utf8"),
    ) as Settings;
  }

  listPages(): PageSummary[] {
    return [...this.pages.values()]
      .map(({ page }) => ({
        slug: page.slug,
        title: page.title,
        position: page.position,
      }))
      .sort((a, b) => a.position - b.position || a.slug.localeCompare(b.slug));
  }

  getPage(slug: string): PageEntry | null {
    return this.pages.get(slug) ?? null;
  }

  getSettings(): Settings {
    return this.settings;
  }

  // savePage / deletePage / saveSettings — Tasks 8 and 9.
}
```

> The `savePage`, `deletePage`, and `saveSettings` methods are declared on `ContentStore` but not yet implemented, so `implements ContentStore` will not typecheck until Task 8. To keep the tree green, **temporarily** drop `implements ContentStore` from the class declaration in this task and restore it in Task 9. Do not leave stub methods that lie about working.

The `sortPages` order is `position`, then `slug` — asserted in the test above, and relied on by `getPages()` for nav ordering.

- [ ] **Step 5: Run the test to verify boot tests pass**

The `sorts pages by position` test calls `savePage`, which does not exist yet. **Mark it `it.skip` for now** with a comment pointing at Task 8, and un-skip it in Task 8.

Run: `pnpm --filter sunroom test`
Expected: PASS — the init, recovery, and getPage tests all green; one skipped.

- [ ] **Step 6: Commit**

```bash
git add packages/sunroom/src/store/git-store.ts packages/sunroom/src/store/validate-page.ts packages/sunroom/src/store/git-store.test.ts
git commit -m "feat(store): GitStore boot, crash recovery, and in-memory index"
```

---

## Task 8: GitStore — savePage

**Files:**

- Modify: `packages/sunroom/src/store/git-store.ts` (add `savePage`, `withLock`, restore nothing yet)
- Modify: `packages/sunroom/src/store/git-store.test.ts` (un-skip the sorting test, add the save tests)

**Interfaces:**

- Consumes: everything from Task 7.
- Produces: `GitStore.savePage(page: Page, options: SaveOptions): Promise<PageEntry>`
  - Throws `ValidationError` on a bad slug or malformed page.
  - Throws `ConflictError` when `options.baseVersion` does not match the stored version (`null` means "I am creating this page"; a page that already exists with `baseVersion: null` is a conflict).
  - On **any** failure after the file is written, resets the working tree, reloads the index from disk, and rethrows — so a failed save leaves no partial state.

- [ ] **Step 1: Write the failing tests**

Add to `packages/sunroom/src/store/git-store.test.ts` (and change the skipped `sorts pages by position` test back to `it`):

```ts
const AUTHOR = { name: "Jane Doe", email: "jane@acme.com" };

function page(overrides: Partial<Page> = {}): Page {
  return {
    slug: "about",
    title: "About Us",
    position: 1,
    seo: {},
    sections: [{ id: "sec_1", type: "hero", props: { heading: "Hello" } }],
    ...overrides,
  };
}

describe("savePage", () => {
  it("creates a page, commits it, and returns a version", async () => {
    const store = await freshStore();
    const saved = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    expect(saved.version).toHaveLength(16);
    expect(store.getPage("about")?.page.title).toBe("About Us");
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Create about");
    expect(await git(dir, ["log", "-1", "--format=%an <%ae>"])).toBe(
      "Jane Doe <jane@acme.com>",
    );
  });

  it("writes the page to its slug-derived path", async () => {
    const store = await freshStore();
    await store.savePage(page({ slug: "services/pricing" }), {
      baseVersion: null,
      author: AUTHOR,
    });
    const raw = await readFile(
      join(dir, "pages", "services", "pricing.json"),
      "utf8",
    );
    expect(JSON.parse(raw).title).toBe("About Us");
  });

  it("updates an existing page when given its current version", async () => {
    const store = await freshStore();
    const first = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    const second = await store.savePage(page({ title: "Renamed" }), {
      baseVersion: first.version,
      author: AUTHOR,
    });

    expect(second.version).not.toBe(first.version);
    expect(store.getPage("about")?.page.title).toBe("Renamed");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Update about");
  });

  it("rejects a stale version instead of clobbering", async () => {
    const store = await freshStore();
    const first = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });
    await store.savePage(page({ title: "Renamed by someone else" }), {
      baseVersion: first.version,
      author: AUTHOR,
    });

    await expect(
      store.savePage(page({ title: "My edit" }), {
        baseVersion: first.version,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ConflictError);

    expect(store.getPage("about")?.page.title).toBe("Renamed by someone else");
  });

  it("rejects creating a page that already exists", async () => {
    const store = await freshStore();
    await store.savePage(page(), { baseVersion: null, author: AUTHOR });
    await expect(
      store.savePage(page(), { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow(ConflictError);
  });

  it("rejects a reserved slug", async () => {
    const store = await freshStore();
    await expect(
      store.savePage(page({ slug: "admin" }), {
        baseVersion: null,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ValidationError);
    expect(existsSync(join(dir, "pages", "admin.json"))).toBe(false);
  });

  it("rejects a slug that would escape the content directory", async () => {
    const store = await freshStore();
    await expect(
      store.savePage(page({ slug: "../../etc/passwd" }), {
        baseVersion: null,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects duplicate section ids", async () => {
    const store = await freshStore();
    const bad = page({
      sections: [
        { id: "dup", type: "hero", props: {} },
        { id: "dup", type: "hero", props: {} },
      ],
    });
    await expect(
      store.savePage(bad, { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow(ValidationError);
  });

  it("serialises concurrent saves instead of interleaving them", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    // Both start from the same base version. One must win; the other must conflict.
    const results = await Promise.allSettled([
      store.savePage(page({ title: "A" }), {
        baseVersion: created.version,
        author: AUTHOR,
      }),
      store.savePage(page({ title: "B" }), {
        baseVersion: created.version,
        author: AUTHOR,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictError,
    );
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
  });

  it("leaves no partial state when the commit fails", async () => {
    const store = await freshStore();
    const before = store.getPage("");

    // Break the repo so `git commit` cannot succeed.
    await rm(join(dir, ".git"), { recursive: true, force: true });

    await expect(
      store.savePage(page(), { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow();

    // The in-memory index must not have absorbed the failed write.
    expect(store.getPage("about")).toBeNull();
    expect(store.getPage("")?.version).toBe(before?.version);
  });
});
```

Add the imports these need at the top of the file:

```ts
import { existsSync } from "node:fs";
import { ConflictError, ValidationError } from "../errors.js";
import type { Page } from "./types.js";
```

> The last test destroys `.git`, so `recover()` inside the catch block will _also_ throw. That is expected and must not mask the original error — see the implementation note in Step 3.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `store.savePage is not a function`.

- [ ] **Step 3: Implement `savePage`**

Add to the `GitStore` class in `packages/sunroom/src/store/git-store.ts`:

```ts
  /**
   * Serialises all writes through a promise chain. Two concurrent saves to the
   * same page cannot interleave; the second one sees the first one's version
   * and conflicts, which is the correct answer.
   */
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn, fn)
    this.chain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  /**
   * Rolls the working copy back to HEAD and reloads the index from disk.
   *
   * Called when a save fails partway. If the rollback itself fails (a truly
   * broken repo), we swallow that error so the ORIGINAL failure is what the
   * caller sees — a "could not reset" message would hide the real cause.
   */
  private async rollback(): Promise<void> {
    try {
      await this.recover()
      await this.load()
    } catch {
      // Deliberately ignored. See above.
    }
  }

  async savePage(page: Page, { baseVersion, author }: SaveOptions): Promise<PageEntry> {
    return this.withLock(async () => {
      const issues = validatePageShape(page)
      if (issues.length > 0) throw new ValidationError(issues)

      const existing = this.pages.get(page.slug) ?? null
      if ((existing?.version ?? null) !== baseVersion) {
        throw new ConflictError(page.slug)
      }

      const rel = slugToPath(page.slug)
      const json = serialize(page)

      try {
        await writeAtomic(join(this.dir, rel), json)
        await git(this.dir, ['add', '--', rel])
        await git(
          this.dir,
          commitArgs(author, `${existing ? 'Update' : 'Create'} ${page.slug || 'home'}`),
        )
      } catch (error) {
        await this.rollback()
        throw error
      }

      const entry: PageEntry = { page, version: contentVersion(json) }
      this.pages.set(page.slug, entry)
      return entry
    })
  }
```

Two things to notice, because they are the whole point of this method:

1. **The index is updated only after the commit succeeds.** If git fails, the in-memory state is rolled back to match disk, so the store never reports content it did not persist.
2. **`validatePageShape` runs before anything touches the filesystem**, and it calls `validateSlug`. `slugToPath` interpolates the slug into a path, so an unvalidated slug would be an arbitrary-file-write primitive. The ordering here is a security property, not a stylistic choice.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter sunroom test`
Expected: PASS — all 10 `savePage` tests plus the previously-skipped sorting test.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/store/git-store.ts packages/sunroom/src/store/git-store.test.ts
git commit -m "feat(store): savePage with write lock, optimistic concurrency, and rollback"
```

---

## Task 9: GitStore — deletePage and settings

**Files:**

- Modify: `packages/sunroom/src/store/git-store.ts`
- Modify: `packages/sunroom/src/store/git-store.test.ts`
- Create: `packages/sunroom/src/store/singleton.ts`

**Interfaces:**

- Produces:
  - `GitStore.deletePage(slug, { baseVersion, author }): Promise<void>` — throws `ValidationError` on the home slug, `NotFoundError` on an unknown slug, `ConflictError` on a stale version.
  - `GitStore.saveSettings(settings, { author }): Promise<void>`
  - `GitStore` now genuinely `implements ContentStore` — restore the clause dropped in Task 7.
  - `getStore(config: SunroomConfig): Promise<ContentStore>` — memoised per `contentDir`, so one process shares one index.
  - `resetStores(): void` — test-only.

- [ ] **Step 1: Write the failing tests**

Add to `packages/sunroom/src/store/git-store.test.ts`:

```ts
describe("deletePage", () => {
  it("removes the file, commits, and drops it from the index", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    await store.deletePage("about", {
      baseVersion: created.version,
      author: AUTHOR,
    });

    expect(store.getPage("about")).toBeNull();
    expect(existsSync(join(dir, "pages", "about.json"))).toBe(false);
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Delete about");
  });

  it("refuses to delete the home page", async () => {
    const store = await freshStore();
    const home = store.getPage("");
    await expect(
      store.deletePage("", { baseVersion: home!.version, author: AUTHOR }),
    ).rejects.toThrow(ValidationError);
    expect(store.getPage("")).not.toBeNull();
  });

  it("throws NotFoundError for an unknown slug", async () => {
    const store = await freshStore();
    await expect(
      store.deletePage("ghost", { baseVersion: "whatever", author: AUTHOR }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a stale version", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });
    await store.savePage(page({ title: "Changed" }), {
      baseVersion: created.version,
      author: AUTHOR,
    });

    await expect(
      store.deletePage("about", {
        baseVersion: created.version,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ConflictError);
    expect(store.getPage("about")).not.toBeNull();
  });
});

describe("saveSettings", () => {
  it("persists and commits settings", async () => {
    const store = await freshStore();
    await store.saveSettings(
      { seoDefaults: { description: "A lovely business" }, redirects: [] },
      { author: AUTHOR },
    );

    expect(store.getSettings().seoDefaults.description).toBe(
      "A lovely business",
    );
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe(
      "Update settings",
    );

    const reloaded = await freshStore();
    expect(reloaded.getSettings().seoDefaults.description).toBe(
      "A lovely business",
    );
  });
});
```

Add `NotFoundError` to the errors import at the top of the test file.

Create `packages/sunroom/src/store/singleton.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../core/registry.js";
import { getStore, resetStores } from "./singleton.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-singleton-"));
  resetStores();
});

afterEach(async () => {
  resetStores();
  await rm(dir, { recursive: true, force: true });
});

describe("getStore", () => {
  it("returns the same initialised store for the same content dir", async () => {
    const config = resolveConfig({ contentDir: dir, sections: {} });
    const [a, b] = await Promise.all([getStore(config), getStore(config)]);
    expect(a).toBe(b);
    expect(a.listPages()).toEqual([{ slug: "", title: "Home", position: 0 }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `store.deletePage is not a function`, and `Cannot find module './singleton.js'`.

- [ ] **Step 3: Implement `deletePage` and `saveSettings`**

Add to the `GitStore` class:

```ts
  async deletePage(
    slug: string,
    { baseVersion, author }: { baseVersion: string; author: Author },
  ): Promise<void> {
    return this.withLock(async () => {
      if (slug === HOME_SLUG) {
        throw new ValidationError([{ path: 'slug', message: 'The home page cannot be deleted' }])
      }

      const existing = this.pages.get(slug)
      if (!existing) throw new NotFoundError(slug)
      if (existing.version !== baseVersion) throw new ConflictError(slug)

      const rel = slugToPath(slug)

      try {
        await git(this.dir, ['rm', '--quiet', '--', rel])
        await git(this.dir, commitArgs(author, `Delete ${slug}`))
      } catch (error) {
        await this.rollback()
        throw error
      }

      this.pages.delete(slug)
    })
  }

  async saveSettings(settings: Settings, { author }: { author: Author }): Promise<void> {
    return this.withLock(async () => {
      const json = serialize(settings)

      try {
        await writeAtomic(join(this.dir, 'settings.json'), json)
        await git(this.dir, ['add', '--', 'settings.json'])
        await git(this.dir, commitArgs(author, 'Update settings'))
      } catch (error) {
        await this.rollback()
        throw error
      }

      this.settings = settings
    })
  }
```

Restore `implements ContentStore` on the class declaration:

```ts
export class GitStore implements ContentStore {
```

- [ ] **Step 4: Implement `singleton.ts`**

Create `packages/sunroom/src/store/singleton.ts`:

```ts
import type { SunroomConfig } from "../core/registry.js";
import { GitStore } from "./git-store.js";
import type { ContentStore } from "./types.js";

/**
 * One store per content directory, per process.
 *
 * The index lives in memory, so every request in this process must share the
 * same instance. This is also why the app must run as a SINGLE INSTANCE — two
 * containers would each hold their own index and diverge on the first save.
 * See spec §5.
 */
const stores = new Map<string, Promise<ContentStore>>();

export function getStore(config: SunroomConfig): Promise<ContentStore> {
  const existing = stores.get(config.contentDir);
  if (existing) return existing;

  const store = new GitStore(config.contentDir);
  const ready = store.init().then(() => store);
  stores.set(config.contentDir, ready);

  // A failed init must not be cached, or the process is poisoned forever.
  ready.catch(() => stores.delete(config.contentDir));

  return ready;
}

/** Test-only. */
export function resetStores(): void {
  stores.clear();
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS. `implements ContentStore` now typechecks because every method exists.

- [ ] **Step 6: Commit**

```bash
git add packages/sunroom/src/store/
git commit -m "feat(store): deletePage, settings, and the per-content-dir store singleton"
```

---

## Task 10: Rendering a section list

**Files:**

- Create: `packages/sunroom/src/render/sections.tsx`
- Test: `packages/sunroom/src/render/sections.test.tsx`

**Interfaces:**

- Consumes: `SunroomConfig` from `core/registry.ts`; `SectionInstance` from `store/types.ts`.
- Produces: `<Sections config={config} sections={sections} />` — walks the ordered section list, looks each `type` up in the registry, renders `<Component {...props} />`.

An unregistered section type **must not crash the page**. It renders nothing, warns in development, and is caught in CI by `sunroom check` (Phase 7). Spec §7: the same condition is caught at three different distances.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/render/sections.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { f } from "../core/fields.js";
import { defineSection, resolveConfig } from "../core/registry.js";
import type { SectionInstance } from "../store/types.js";
import { Sections } from "./sections.js";

function Hero({ heading }: { heading: string }) {
  return <h1>{heading}</h1>;
}

function Quote({ text }: { text?: string }) {
  return <blockquote>{text}</blockquote>;
}

const config = resolveConfig({
  contentDir: "/unused",
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: { heading: f.text({ required: true }) },
    }),
    quote: defineSection({
      label: "Quote",
      component: Quote,
      fields: { text: f.text() },
    }),
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Sections", () => {
  it("renders each section with its props, in order", () => {
    const sections: SectionInstance[] = [
      { id: "a", type: "hero", props: { heading: "Welcome" } },
      { id: "b", type: "quote", props: { text: "Lovely" } },
    ];
    const html = renderToStaticMarkup(
      <Sections config={config} sections={sections} />,
    );
    expect(html).toBe("<h1>Welcome</h1><blockquote>Lovely</blockquote>");
  });

  it("renders nothing for an empty section list", () => {
    expect(
      renderToStaticMarkup(<Sections config={config} sections={[]} />),
    ).toBe("");
  });

  it("skips an unregistered section type instead of crashing the page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sections: SectionInstance[] = [
      { id: "a", type: "hero", props: { heading: "Welcome" } },
      { id: "b", type: "deleted-component", props: {} },
    ];

    const html = renderToStaticMarkup(
      <Sections config={config} sections={sections} />,
    );

    expect(html).toBe("<h1>Welcome</h1>");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("deleted-component");
    expect(warn.mock.calls[0]?.[0]).toContain("sunroom check");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './sections.js'`.

- [ ] **Step 3: Implement `sections.tsx`**

Create `packages/sunroom/src/render/sections.tsx`:

```tsx
import type { ReactElement } from "react";
import type { SunroomConfig } from "../core/registry.js";
import type { SectionInstance } from "../store/types.js";

export interface SectionsProps {
  config: SunroomConfig;
  sections: SectionInstance[];
}

/**
 * Renders a page's ordered section list against the registry.
 *
 * A section whose component no longer exists in code renders nothing rather
 * than crashing the client's live page. The same condition is a hard failure
 * in `sunroom check` (Phase 7), so it cannot reach production unnoticed —
 * this path exists for the moments in between.
 */
export function Sections({ config, sections }: SectionsProps): ReactElement {
  return (
    <>
      {sections.map((section) => {
        const definition = config.sections[section.type];

        if (!definition) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[sunroom] No section is registered for type "${section.type}" ` +
                `(id ${section.id}). Skipping it. Run \`sunroom check\` to catch this in CI.`,
            );
          }
          return null;
        }

        const Component = definition.component;
        return <Component key={section.id} {...section.props} />;
      })}
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/render/
git commit -m "feat(render): section list rendering with graceful unknown-type handling"
```

---

## Task 11: `createSunroom` — the Next integration

**Files:**

- Create: `packages/sunroom/src/sunroom.tsx`
- Test: `packages/sunroom/src/sunroom.test.tsx`

**Interfaces:**

- Consumes: `resolveConfig`, `SunroomInput`, `SunroomConfig`; `getStore`; `paramsToSlug`, `slugToParams`; `Sections`.
- Produces: `createSunroom(input: SunroomInput)` returning:
  - `config: SunroomConfig`
  - `Page(props: { params: Promise<{ slug?: string[] }> }): Promise<ReactElement>` — calls Next's `notFound()` for an unknown slug.
  - `generateStaticParams(): Promise<{ slug: string[] }[]>`
  - `generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata>`
  - `getPages(): Promise<PageSummary[]>` — the escape hatch a bespoke `<Nav />` uses.
  - `getPage(slug: string): Promise<Page | null>` — the escape hatch a hand-written route uses.

`params` is a **Promise** in Next 15 and must be awaited. This is the single easiest thing to get wrong here.

- [ ] **Step 1: Write the failing test**

Create `packages/sunroom/src/sunroom.test.tsx`:

```tsx
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { f } from "./core/fields.js";
import { defineSection } from "./core/registry.js";
import { GitStore } from "./store/git-store.js";
import { resetStores } from "./store/singleton.js";
import { createSunroom } from "./sunroom.js";

function Hero({ heading }: { heading: string }) {
  return <h1>{heading}</h1>;
}

const AUTHOR = { name: "T", email: "t@e.com" };

let dir: string;

async function seed() {
  const store = new GitStore(dir);
  await store.init();

  const home = store.getPage("")!;
  await store.savePage(
    {
      slug: "",
      title: "Home",
      position: 0,
      seo: {},
      sections: [{ id: "s1", type: "hero", props: { heading: "Welcome" } }],
    },
    { baseVersion: home.version, author: AUTHOR },
  );

  await store.savePage(
    {
      slug: "about",
      title: "About Us",
      position: 1,
      seo: { title: "About | Acme", description: "Who we are" },
      sections: [{ id: "s2", type: "hero", props: { heading: "About" } }],
    },
    { baseVersion: null, author: AUTHOR },
  );
}

function sunroom() {
  return createSunroom({
    contentDir: dir,
    sections: {
      hero: defineSection({
        label: "Hero",
        component: Hero,
        fields: { heading: f.text({ required: true }) },
      }),
    },
  });
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-next-"));
  resetStores();
  await seed();
});

afterEach(async () => {
  resetStores();
  await rm(dir, { recursive: true, force: true });
});

describe("generateStaticParams", () => {
  it("returns a param entry per page, with the home page as an empty segment list", async () => {
    const params = await sunroom().generateStaticParams();
    expect(params).toEqual([{ slug: [] }, { slug: ["about"] }]);
  });
});

describe("Page", () => {
  it("renders the home page for an absent slug param", async () => {
    const element = await sunroom().Page({ params: Promise.resolve({}) });
    expect(renderToStaticMarkup(element)).toBe("<h1>Welcome</h1>");
  });

  it("renders a page by slug", async () => {
    const element = await sunroom().Page({
      params: Promise.resolve({ slug: ["about"] }),
    });
    expect(renderToStaticMarkup(element)).toBe("<h1>About</h1>");
  });

  it("calls notFound() for an unknown slug", async () => {
    // Next's notFound() signals by throwing.
    await expect(
      sunroom().Page({ params: Promise.resolve({ slug: ["ghost"] }) }),
    ).rejects.toThrow();
  });
});

describe("generateMetadata", () => {
  it("prefers the page seo title, falling back to the page title", async () => {
    const s = sunroom();
    expect(
      await s.generateMetadata({
        params: Promise.resolve({ slug: ["about"] }),
      }),
    ).toEqual({
      title: "About | Acme",
      description: "Who we are",
    });
    expect(await s.generateMetadata({ params: Promise.resolve({}) })).toEqual({
      title: "Home",
      description: undefined,
    });
  });

  it("returns empty metadata for an unknown slug", async () => {
    expect(
      await sunroom().generateMetadata({
        params: Promise.resolve({ slug: ["ghost"] }),
      }),
    ).toEqual({});
  });
});

describe("escape hatches", () => {
  it("getPages returns the ordered page list for a bespoke nav", async () => {
    expect(await sunroom().getPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
      { slug: "about", title: "About Us", position: 1 },
    ]);
  });

  it("getPage returns a page, or null", async () => {
    const s = sunroom();
    expect((await s.getPage("about"))?.title).toBe("About Us");
    expect(await s.getPage("ghost")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `Cannot find module './sunroom.js'`.

- [ ] **Step 3: Implement `sunroom.tsx`**

Create `packages/sunroom/src/sunroom.tsx`:

````tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import type { SunroomConfig, SunroomInput } from "./core/registry.js";
import { resolveConfig } from "./core/registry.js";
import { Sections } from "./render/sections.js";
import { paramsToSlug, slugToParams } from "./store/paths.js";
import { getStore } from "./store/singleton.js";
import type { Page, PageSummary } from "./store/types.js";

/** Next 15 passes `params` as a Promise. */
interface RouteProps {
  params: Promise<{ slug?: string[] }>;
}

export interface Sunroom {
  config: SunroomConfig;
  Page(props: RouteProps): Promise<ReactElement>;
  generateStaticParams(): Promise<{ slug: string[] }[]>;
  generateMetadata(props: RouteProps): Promise<Metadata>;
  getPages(): Promise<PageSummary[]>;
  getPage(slug: string): Promise<Page | null>;
}

/**
 * Wires a component registry to a content store and returns the exports a Next
 * catch-all route needs.
 *
 * ```tsx
 * // sunroom.config.ts
 * export default createSunroom({ sections: { hero: defineSection({ ... }) } })
 *
 * // app/[[...slug]]/page.tsx
 * import sunroom from '@/sunroom.config'
 * export const generateStaticParams = sunroom.generateStaticParams
 * export const generateMetadata = sunroom.generateMetadata
 * export default sunroom.Page
 * ```
 */
export function createSunroom(input: SunroomInput): Sunroom {
  const config = resolveConfig(input);

  async function generateStaticParams(): Promise<{ slug: string[] }[]> {
    const store = await getStore(config);
    return store.listPages().map((page) => ({ slug: slugToParams(page.slug) }));
  }

  async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
    const { slug } = await params;
    const store = await getStore(config);
    const entry = store.getPage(paramsToSlug(slug));
    if (!entry) return {};

    const { seoDefaults } = store.getSettings();
    return {
      title: entry.page.seo.title ?? entry.page.title,
      description: entry.page.seo.description ?? seoDefaults.description,
    };
  }

  async function Page({ params }: RouteProps): Promise<ReactElement> {
    const { slug } = await params;
    const store = await getStore(config);
    const entry = store.getPage(paramsToSlug(slug));
    if (!entry) notFound();

    return <Sections config={config} sections={entry.page.sections} />;
  }

  async function getPages(): Promise<PageSummary[]> {
    const store = await getStore(config);
    return store.listPages();
  }

  async function getPage(slug: string): Promise<Page | null> {
    const store = await getStore(config);
    return store.getPage(slug)?.page ?? null;
  }

  return {
    config,
    Page,
    generateStaticParams,
    generateMetadata,
    getPages,
    getPage,
  };
}
````

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck`
Expected: PASS, 8 tests in `sunroom.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/sunroom.tsx packages/sunroom/src/sunroom.test.tsx
git commit -m "feat: createSunroom — the Next App Router integration"
```

---

## Task 12: Public exports

**Files:**

- Modify: `packages/sunroom/src/index.ts`
- Modify: `packages/sunroom/src/index.test.ts`

**Interfaces:**

- Produces: the package's entire public surface. Anything not exported here is internal and may change freely.

- [ ] **Step 1: Write the failing test**

Replace `packages/sunroom/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as sunroom from "./index.js";

describe("public exports", () => {
  it("exports the authoring API", () => {
    expect(typeof sunroom.createSunroom).toBe("function");
    expect(typeof sunroom.defineSection).toBe("function");
    expect(typeof sunroom.f.text).toBe("function");
  });

  it("exports the store and its errors for advanced use", () => {
    expect(typeof sunroom.GitStore).toBe("function");
    expect(typeof sunroom.validateProps).toBe("function");
    expect(sunroom.ConflictError.prototype).toBeInstanceOf(Error);
    expect(sunroom.NotFoundError.prototype).toBeInstanceOf(Error);
    expect(sunroom.ValidationError.prototype).toBeInstanceOf(Error);
  });

  it("exports a version string", () => {
    expect(typeof sunroom.VERSION).toBe("string");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter sunroom test`
Expected: FAIL — `sunroom.createSunroom is not a function`.

- [ ] **Step 3: Implement `index.ts`**

Replace `packages/sunroom/src/index.ts`:

```ts
export const VERSION = "0.0.0";

// Authoring
export { createSunroom } from "./sunroom.js";
export type { Sunroom } from "./sunroom.js";
export {
  defineSection,
  resolveConfig,
  DEFAULT_CONTENT_DIR,
} from "./core/registry.js";
export type {
  SectionDefinition,
  SunroomConfig,
  SunroomInput,
} from "./core/registry.js";
export { f } from "./core/fields.js";
export type {
  FieldDescriptor,
  FieldMap,
  ImageValue,
  InferFields,
  SelectOption,
} from "./core/fields.js";

// Validation
export { validateProps } from "./core/validate.js";
export { ConflictError, NotFoundError, ValidationError } from "./errors.js";
export type { ValidationIssue } from "./errors.js";

// Store — exported for the admin (Phase 5) and for tooling
export { GitStore, SYSTEM_AUTHOR } from "./store/git-store.js";
export { getStore, resetStores } from "./store/singleton.js";
export { validatePageShape } from "./store/validate-page.js";
export {
  HOME_SLUG,
  RESERVED_SLUGS,
  paramsToSlug,
  pathToSlug,
  slugToParams,
  slugToPath,
  validateSlug,
} from "./store/paths.js";
export { DEFAULT_SETTINGS } from "./store/types.js";
export type {
  Author,
  ContentStore,
  Page,
  PageEntry,
  PageSeo,
  PageSummary,
  SaveOptions,
  SectionInstance,
  Settings,
} from "./store/types.js";

// Rendering
export { Sections } from "./render/sections.js";
export type { SectionsProps } from "./render/sections.js";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter sunroom test && pnpm --filter sunroom typecheck && pnpm --filter sunroom build`
Expected: all PASS. The build emits `dist/index.js` and `dist/index.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/sunroom/src/index.ts packages/sunroom/src/index.test.ts
git commit -m "feat: public package exports"
```

---

## Task 13: The demo site

**Files:**

- Create: `examples/demo-site/package.json`, `tsconfig.json`, `next.config.ts`
- Create: `examples/demo-site/sunroom.config.ts`
- Create: `examples/demo-site/components/Hero.tsx`, `components/Testimonials.tsx`, `components/Nav.tsx`
- Create: `examples/demo-site/app/layout.tsx`, `app/[[...slug]]/page.tsx`, `app/globals.css`
- Create: `examples/demo-site/scripts/seed.ts`

**Interfaces:**

- Consumes: the entire public API from Task 12.
- Produces: a running Next site whose pages, titles, nav, and section composition all come from the content store. This is the reference implementation and the Phase 8 E2E target.

No image fields — media resolution is Phase 6 (see Deviations).

- [ ] **Step 1: Create the package**

Create `examples/demo-site/package.json`:

```json
{
  "name": "demo-site",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "node --experimental-strip-types scripts/seed.ts",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "test": "echo 'no tests' && exit 0"
  },
  "dependencies": {
    "next": "^15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sunroom": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.7.5",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.3"
  }
}
```

Create `examples/demo-site/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "types": ["node"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `examples/demo-site/next.config.ts`:

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  // The store shells out to git and reads the filesystem; it must not be bundled.
  serverExternalPackages: ["sunroom"],
};

export default config;
```

- [ ] **Step 2: Create the bespoke components**

These are _your_ components — fully styled, entirely yours. Sunroom never touches how they look.

Create `examples/demo-site/components/Hero.tsx`:

```tsx
export default function Hero({
  heading,
  body,
}: {
  heading: string;
  body?: string;
}) {
  return (
    <section className="hero">
      <h1>{heading}</h1>
      {body ? (
        <div className="hero-body" dangerouslySetInnerHTML={{ __html: body }} />
      ) : null}
    </section>
  );
}
```

`body` is a `richText` field, stored as an HTML string — hence `dangerouslySetInnerHTML`. The content comes from the site owner through an editor you control, not from the public.

Create `examples/demo-site/components/Testimonials.tsx`:

```tsx
export default function Testimonials({
  title,
  quotes,
}: {
  title?: string;
  quotes?: { quote?: string; author?: string }[];
}) {
  return (
    <section className="testimonials">
      {title ? <h2>{title}</h2> : null}
      <ul>
        {(quotes ?? []).map((q, i) => (
          <li key={i}>
            <blockquote>{q.quote}</blockquote>
            <cite>{q.author}</cite>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Create `examples/demo-site/components/Nav.tsx`:

```tsx
import Link from "next/link";
import sunroom from "@/sunroom.config";

export default async function Nav() {
  const pages = await sunroom.getPages();

  return (
    <nav>
      <ul>
        {pages.map((page) => (
          <li key={page.slug}>
            <Link href={page.slug === "" ? "/" : `/${page.slug}`}>
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**This is the whole reason `getPages()` exists.** There is no nav editor in v1 — the nav is a bespoke component that derives itself from the page list. Create a page in the CMS and it appears here.

- [ ] **Step 3: Create the registry and routes**

Create `examples/demo-site/sunroom.config.ts`:

```ts
import { createSunroom, defineSection, f } from "sunroom";
import Hero from "@/components/Hero";
import Testimonials from "@/components/Testimonials";

export default createSunroom({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: {
        heading: f.text({ label: "Heading", required: true }),
        body: f.richText({ label: "Body" }),
      },
    }),
    testimonials: defineSection({
      label: "Testimonials",
      component: Testimonials,
      fields: {
        title: f.text({ label: "Section title" }),
        quotes: f.array(
          f.object({
            quote: f.textarea({ label: "Quote" }),
            author: f.text({ label: "Author" }),
          }),
          { label: "Quotes" },
        ),
      },
    }),
  },
});
```

Create `examples/demo-site/app/[[...slug]]/page.tsx`:

```tsx
import sunroom from "@/sunroom.config";

export const generateStaticParams = sunroom.generateStaticParams;
export const generateMetadata = sunroom.generateMetadata;
export default sunroom.Page;
```

**That is the entire routing setup.** Four lines.

Create `examples/demo-site/app/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

Create `examples/demo-site/app/globals.css`:

```css
:root {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
}

nav ul {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 1rem 2rem;
  border-bottom: 1px solid #e5e5e5;
}

main {
  padding: 2rem;
}

.hero h1 {
  font-size: 3rem;
  margin: 0 0 1rem;
}

.testimonials ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 1.5rem;
}

.testimonials blockquote {
  margin: 0 0 0.5rem;
  font-style: italic;
}
```

- [ ] **Step 4: Write the seed script**

Create `examples/demo-site/scripts/seed.ts`:

```ts
import { GitStore } from "sunroom";

const AUTHOR = { name: "Seed", email: "seed@example.com" };
const CONTENT_DIR = process.env.SUNROOM_CONTENT_DIR ?? "./.sunroom-content";

const store = new GitStore(CONTENT_DIR);
await store.init();

const home = store.getPage("");
if (!home) throw new Error("Expected init() to create a home page");

await store.savePage(
  {
    slug: "",
    title: "Home",
    position: 0,
    seo: { description: "A bespoke site, editable by its owner." },
    sections: [
      {
        id: "home-hero",
        type: "hero",
        props: {
          heading: "Sunlight Landscaping",
          body: "<p>Gardens that look after themselves. Mostly.</p>",
        },
      },
      {
        id: "home-testimonials",
        type: "testimonials",
        props: {
          title: "What our clients say",
          quotes: [
            {
              quote: "They turned a car park into a meadow.",
              author: "Priya N.",
            },
            { quote: "Punctual, tidy, and the roses lived.", author: "Tom B." },
          ],
        },
      },
    ],
  },
  { baseVersion: home.version, author: AUTHOR },
);

await store.savePage(
  {
    slug: "about",
    title: "About",
    position: 1,
    seo: { title: "About | Sunlight Landscaping" },
    sections: [
      {
        id: "about-hero",
        type: "hero",
        props: {
          heading: "Twelve years of digging",
          body: "<p>We are a small team based in Leeds.</p>",
        },
      },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

console.log("Seeded 2 pages into", CONTENT_DIR);
```

- [ ] **Step 5: Build, seed, and run the site**

The seed script imports from `sunroom`, which resolves through the package's `exports` field to `dist/`.
**The package must be built before the seed script can run.**

```bash
pnpm install
pnpm --filter sunroom build
pnpm --filter demo-site seed
pnpm --filter demo-site dev
```

Expected from `seed`: `Seeded 2 pages into ./.sunroom-content`

- [ ] **Step 6: Verify the read path end to end**

In another terminal:

```bash
curl -s localhost:3000 | grep -o '<h1>[^<]*</h1>'
curl -s localhost:3000/about | grep -o '<h1>[^<]*</h1>'
curl -s localhost:3000 | grep -o 'href="/about"'
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/does-not-exist
```

Expected:

- `<h1>Sunlight Landscaping</h1>`
- `<h1>Twelve years of digging</h1>`
- `href="/about"` — the nav derived itself from the page list
- `404`

Then confirm the store is real: `git -C examples/demo-site/.sunroom-content log --oneline`. You should see `Create about`, `Update home`, and `Initialize Sunroom content`, each authored by Seed.

**This is the moment the read path is proven.** Pages, titles, metadata, nav, and section composition all came from the content store; the components and their styling came from you.

- [ ] **Step 7: Verify the whole workspace is green**

Run:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: all four pass.

- [ ] **Step 8: Commit**

```bash
git add examples/demo-site
git commit -m "feat(demo): bespoke reference site driven by the content store"
```

---

## What this plan does NOT build

Stated plainly so nobody thinks it was forgotten:

| Not built here                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Where it lands |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Cache invalidation.** The spec lists "cache tags" under Phase 3, but nothing in this plan _writes_ content at runtime, so there is nothing to invalidate. Pages are statically generated from `generateStaticParams` at build and served from the full route cache. Wiring `revalidatePath`/`revalidateTag` belongs with the save path that triggers it — building it now would mean writing an invalidation mechanism with no way to test that it invalidates anything. | Phase 5        |
| Google OAuth, the editor allowlist, session cookies                                                                                                                                                                                                                                                                                                                                                                                                                        | Phase 4        |
| The admin UI, the field-form renderer, drag-reorder, `revalidateTag` on save                                                                                                                                                                                                                                                                                                                                                                                               | Phase 5        |
| Media: R2 presigned uploads, the media library, `f.image()` resolving to `ImageValue`                                                                                                                                                                                                                                                                                                                                                                                      | Phase 6        |
| The R2 backup mirror, the build-time snapshot, `sunroom restore`, boot paths 2 and 3                                                                                                                                                                                                                                                                                                                                                                                       | Phase 7        |
| Automatic slug redirects, `deprecated: true` enforcement, `sunroom check`, `sunroom migrate`                                                                                                                                                                                                                                                                                                                                                                               | Phase 7        |
| The Playwright E2E, the Dockerfile, the onboarding runbook                                                                                                                                                                                                                                                                                                                                                                                                                 | Phase 8        |

The `deprecated` and `redirects` **fields exist** in the types (they are part of the data model), but nothing reads them yet. That is deliberate — the shapes are cheap to carry now and expensive to retrofit into content that already exists.
