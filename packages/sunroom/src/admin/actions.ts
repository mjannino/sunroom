import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { resolveConfig } from "../core/registry.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { getStore } from "../store/singleton.js";
import type { ContentStore } from "../store/types.js";
import type { Author, Page } from "../store/types.js";
import { HOME_SLUG, validateSlug } from "../store/paths.js";
import { getSession } from "./session-server.js";
import {
  createPresignedUpload,
  deleteObject,
  R2ConfigError,
} from "./media/r2.js";
import { makeResolveMedia } from "../render/media.js";
import type {
  ActionResult,
  CommitMediaInput,
  MediaResult,
} from "./editor/types.js";

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

const UNAUTH_MEDIA = {
  ok: false,
  reason: "unauthorized",
  message: "You must be signed in.",
} as const;

// Raster image types only: `accept="image/*"` on the client file input is
// just a hint, not a guarantee, so a presigned "image" PUT must be re-checked
// server-side. SVG is deliberately excluded — it can carry <script>, and is a
// stored-XSS sink if R2_PUBLIC_BASE is ever same-origin.
const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

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
    revalidatePath(routeOf(page.slug));
    // The page's title (edited here) appears in the nav, so refresh the layout
    // too. Over-invalidation is negligible on an in-memory single instance.
    revalidatePath("/", "layout");
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
    revalidatePath(routeOf(input.slug));
    revalidatePath("/", "layout");
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
    revalidatePath(routeOf(slug));
    revalidatePath("/", "layout");
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
    if (changed) revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function requestUploadAction(
  filename: string,
  mime: string,
): Promise<MediaResult<{ uploadUrl: string; storageKey: string }>> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTH_MEDIA;
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    return {
      ok: false,
      reason: "validation",
      message: "Unsupported image type.",
    };
  }
  try {
    const { uploadUrl, storageKey } = await createPresignedUpload(
      filename,
      mime,
    );
    return { ok: true, uploadUrl, storageKey };
  } catch (e) {
    if (e instanceof R2ConfigError)
      return { ok: false, reason: "config", message: e.message };
    return {
      ok: false,
      reason: "error",
      message: "Could not start the upload.",
    };
  }
}

export async function commitMediaAction(
  input: CommitMediaInput,
): Promise<MediaResult<{ id: string; url: string }>> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTH_MEDIA;
  try {
    const s = await store();
    const id = randomUUID();
    const record = { id, createdAt: new Date().toISOString(), ...input };
    await s.addMedia(record, { author });
    // Return the resolved public URL so the client can show the new thumbnail
    // WITHOUT ever seeing R2 credentials (only the public base).
    const url =
      makeResolveMedia([record], process.env.R2_PUBLIC_BASE)(id)?.url ?? "";
    return { ok: true, id, url };
  } catch {
    return { ok: false, reason: "error", message: "Could not save the media." };
  }
}

export async function deleteMediaAction(
  id: string,
): Promise<MediaResult<Record<string, never>>> {
  "use server";
  const author = await authOr();
  if (!author) return UNAUTH_MEDIA;
  try {
    const s = await store();
    const rec = s.getMedia(id);
    await s.deleteMedia(id, { author });
    if (rec) await deleteObject(rec.storageKey).catch(() => {}); // best-effort blob delete
    // `{ ok: true }` alone doesn't structurally satisfy `{ ok: true } &
    // Record<string, never>` (TS checks the `ok` property against the index
    // signature too); the cast is safe since there is no `T` payload here.
    return { ok: true } as MediaResult<Record<string, never>>;
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "Could not delete the media.",
    };
  }
}
