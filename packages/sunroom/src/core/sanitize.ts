import sanitizeHtml from "sanitize-html";
import type { FieldDescriptor, FieldMap } from "./fields.js";

/** Check if an href is safe (http, https, mailto, or relative path). */
function isValidHref(href: string | undefined): boolean {
  if (!href) return false;
  const lower = href.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    href.startsWith("/") ||
    href.startsWith(".") ||
    !href.includes(":")
  );
}

/** Strict allowlist matching TipTap StarterKit output. */
export function sanitizeRichTextHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "strong", "em", "s", "code", "pre", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a",
    ],
    allowedAttributes: { a: ["href", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const attrs = { ...attribs };
        if (isValidHref(attrs.href)) {
          attrs.rel = "nofollow noopener";
        }
        return { tagName, attribs: attrs };
      },
    },
  });
}

function sanitizeValue(field: FieldDescriptor, value: unknown): unknown {
  if (field.type === "richText")
    return typeof value === "string" ? sanitizeRichTextHtml(value) : value;
  if (
    field.type === "object" &&
    typeof value === "object" && value !== null && !Array.isArray(value)
  )
    return sanitizeProps(field.fields, value as Record<string, unknown>);
  if (field.type === "array" && Array.isArray(value))
    return value.map((item) => sanitizeValue(field.of, item));
  return value;
}

/** Returns a new props object with every richText leaf sanitized. */
export function sanitizeProps(
  fields: FieldMap,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props }; // preserve unknown keys
  for (const [key, field] of Object.entries(fields)) {
    if (key in props) out[key] = sanitizeValue(field, props[key]);
  }
  return out;
}
