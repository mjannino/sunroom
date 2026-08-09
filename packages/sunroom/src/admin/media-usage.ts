import type { Page, Settings } from "../store/types.js";

export interface MediaUsage {
  slug: string;
  where: string;
}

function containsId(value: unknown, id: string): boolean {
  if (typeof value === "string") return value === id;
  if (Array.isArray(value)) return value.some((v) => containsId(v, id));
  if (value && typeof value === "object")
    return Object.values(value).some((v) => containsId(v, id));
  return false;
}

export function findMediaUsage(
  pages: Page[],
  settings: Settings,
  mediaId: string,
): MediaUsage[] {
  const out: MediaUsage[] = [];
  for (const p of pages) {
    for (const section of p.sections) {
      if (containsId(section.props, mediaId)) {
        out.push({ slug: p.slug, where: `section: ${section.type}` });
      }
    }
    if (p.seo.ogImage === mediaId) {
      out.push({ slug: p.slug, where: "SEO image" });
    }
  }
  if (
    settings.site?.header?.type === "image" &&
    settings.site.header.image === mediaId
  ) {
    out.push({ slug: "", where: "site header" });
  }
  return out;
}
