import type { FieldDescriptor, FieldMap, ImageValue } from "../core/fields.js";
import type { MediaRecord } from "../store/types.js";

export type ResolveMedia = (id: string) => ImageValue | undefined;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function makeResolveMedia(
  media: MediaRecord[],
  base: string | undefined,
): ResolveMedia {
  const byId = new Map(media.map((m) => [m.id, m]));
  const cleanBase = base?.replace(/\/$/, "");
  let warned = false;
  return (id) => {
    if (!cleanBase) {
      if (!warned && process.env.NODE_ENV !== "production") {
        console.warn(
          "[sunroom] R2_PUBLIC_BASE is not set — image fields will render nothing.",
        );
        warned = true;
      }
      return undefined;
    }
    const rec = byId.get(id);
    if (!rec) return undefined;
    return {
      url: `${cleanBase}/${rec.storageKey}`,
      width: rec.width,
      height: rec.height,
      alt: rec.alt,
    };
  };
}

function resolveValue(
  field: FieldDescriptor,
  value: unknown,
  resolve: ResolveMedia,
): unknown {
  if (field.type === "image")
    return typeof value === "string" ? resolve(value) : value;
  if (field.type === "object" && isPlainObject(value))
    return resolveMediaInProps(field.fields, value, resolve);
  if (field.type === "array" && Array.isArray(value))
    return value.map((item) => resolveValue(field.of, item, resolve));
  return value;
}

export function resolveMediaInProps(
  fields: FieldMap,
  props: Record<string, unknown>,
  resolve: ResolveMedia,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props }; // preserve unknown keys
  for (const [key, field] of Object.entries(fields)) {
    if (key in props) out[key] = resolveValue(field, props[key], resolve);
  }
  return out;
}
