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
