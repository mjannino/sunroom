import { readFileSync } from "node:fs";
import { DEFAULT_CONTENT_DIR } from "../core/registry.js";
import { resolveSchemaPath } from "./schema-path.js";
import type { SerializedRegistry } from "./editor/types.js";

let cache: SerializedRegistry | null | undefined;

/** Test-only. */
export function __resetSchemaCacheForTest(): void {
  cache = undefined;
}

/**
 * Reads the field schema written by `persistSchema`. Returns null when the
 * schema is unavailable — callers MUST fail closed (reject the write) rather
 * than trust unsanitized input. Only a successful parse is cached; a miss is
 * NOT cached, so a later `persistSchema` write self-heals within the process.
 */
export function loadSchema(): SerializedRegistry | null {
  if (cache) return cache;
  const path = resolveSchemaPath(
    process.env.SUNROOM_CONTENT_DIR ?? DEFAULT_CONTENT_DIR,
  );
  try {
    return (cache = JSON.parse(
      readFileSync(path, "utf8"),
    ) as SerializedRegistry);
  } catch {
    return null;
  }
}
