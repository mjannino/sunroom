import { resolveConfig } from "../core/registry.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { getStore } from "../store/singleton.js";
import type { ContentStore } from "../store/types.js";
import type { Author, Page } from "../store/types.js";
import { HOME_SLUG, validateSlug } from "../store/paths.js";
import { getSession } from "./session-server.js";
import type { ActionResult } from "./editor/types.js";

// Resolved from env (SUNROOM_CONTENT_DIR), not the live config: server
// actions run in their own module graph and cannot receive the config
// object passed to createSunroom() — it holds React components (section
// definitions) and won't serialize across the server-action boundary. See
// the SunroomInput.contentDir doc comment in core/registry.ts.
async function store(): Promise<ContentStore> {
  return getStore(resolveConfig({ sections: {} }));
}

async function authOr(): Promise<Author | null> {
  const session = await getSession();
  return session ? { name: session.name, email: session.email } : null;
}

const UNAUTHORIZED = {
  ok: false,
  reason: "unauthorized",
  message: "You must be signed in.",
} as const;

function fail(e: unknown): ActionResult {
  if (e instanceof ConflictError)
    return { ok: false, reason: "conflict", message: e.message };
  if (e instanceof NotFoundError)
    return { ok: false, reason: "notfound", message: e.message };
  if (e instanceof ValidationError)
    return { ok: false, reason: "validation", message: e.message };
  throw e;
}

function routeOf(slug: string): string {
  return slug === HOME_SLUG ? "/" : `/${slug}`;
}

// Imported lazily: `next`'s package.json has no ESM "exports" map, so a
// static top-level import breaks plain-Node ESM consumers of this module
// (e.g. Node scripts that only need `GitStore`) even though it resolves
// fine inside Next's own bundler. See the identical fix for "next/headers"
// in session-server.ts and "next/navigation" in sunroom.tsx.
async function revalidate(path: string, type?: "layout"): Promise<void> {
  const { revalidatePath } = await import("next/cache");
  if (type) revalidatePath(path, type);
  else revalidatePath(path);
}

export async function savePageAction(
  page: Page,
  baseVersion: string | null,
): Promise<ActionResult> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTHORIZED;
  try {
    const s = await store();
    const entry = await s.savePage(page, { baseVersion, author });
    await revalidate(routeOf(page.slug));
    // The page's title (edited here) appears in the nav, so refresh the layout
    // too. Over-invalidation is negligible on an in-memory single instance.
    await revalidate("/", "layout");
    return { ok: true, version: entry.version };
  } catch (e) {
    return fail(e);
  }
}

export async function createPageAction(input: {
  slug: string;
  title: string;
}): Promise<ActionResult> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTHORIZED;

  const issues = validateSlug(input.slug);
  if (issues.length > 0)
    return { ok: false, reason: "validation", message: issues[0]!.message };

  try {
    const s = await store();
    const position =
      s.listPages().reduce((max, p) => Math.max(max, p.position), 0) + 1;
    const page: Page = {
      slug: input.slug,
      title: input.title,
      position,
      seo: {},
      sections: [],
    };
    const entry = await s.savePage(page, { baseVersion: null, author });
    await revalidate(routeOf(input.slug));
    await revalidate("/", "layout");
    return { ok: true, version: entry.version };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePageAction(slug: string): Promise<ActionResult> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTHORIZED;
  try {
    const s = await store();
    const existing = s.getPage(slug);
    if (!existing)
      return {
        ok: false,
        reason: "notfound",
        message: `Page "${slug}" not found.`,
      };
    // Re-read the current version server-side: a delete is structural, not a
    // content clobber, so the client need not carry a version.
    await s.deletePage(slug, { baseVersion: existing.version, author });
    await revalidate(routeOf(slug));
    await revalidate("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderPagesAction(
  orderedSlugs: string[],
): Promise<ActionResult> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTHORIZED;
  try {
    const s = await store();
    // Re-read each page's current version; reorder is a structural tweak where
    // server-side current-version use is acceptable (not a content clobber).
    let changed = false;
    for (let i = 0; i < orderedSlugs.length; i++) {
      const slug = orderedSlugs[i]!;
      const entry = s.getPage(slug);
      if (!entry || entry.page.position === i) continue;
      await s.savePage(
        { ...entry.page, position: i },
        { baseVersion: entry.version, author },
      );
      changed = true;
    }
    // Only revalidate if a position actually changed — an empty/no-op reorder
    // (e.g. used purely to force store init, as in the auth-gate test) must
    // not trigger revalidation with no corresponding write.
    if (changed) await revalidate("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
