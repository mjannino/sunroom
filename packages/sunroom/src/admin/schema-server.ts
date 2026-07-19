import { readFileSync } from "node:fs";
import type { SerializedRegistry } from "./editor/types.js";

let cache: SerializedRegistry | null | undefined;

/** Test-only. */
export function __resetSchemaCacheForTest(): void { cache = undefined; }

/**
 * Reads the field schema written by `persistSchema`. Returns null when the
 * schema is unavailable — callers MUST fail closed (reject the write) rather
 * than trust unsanitized input.
 */
export function loadSchema(): SerializedRegistry | null {
  if (cache !== undefined) return cache;
  const path = process.env.SUNROOM_SCHEMA_PATH;
  if (!path) return (cache = null);
  try {
    cache = JSON.parse(readFileSync(path, "utf8")) as SerializedRegistry;
  } catch {
    cache = null;
  }
  return cache;
}
