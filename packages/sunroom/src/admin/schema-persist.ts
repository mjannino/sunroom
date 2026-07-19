import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SunroomConfig } from "../core/registry.js";
import { serializeRegistry } from "./editor-core.js";

let persisted = false;

/** Test-only. */
export function __resetSchemaPersistedForTest(): void {
  persisted = false;
}

/**
 * Writes the component-free field schema to SUNROOM_SCHEMA_PATH so the
 * write-path server actions (which cannot import the config) can validate and
 * sanitize against it. Called from the render/admin graph, where the full
 * config — and thus `next/*` and the section components — resolves. No-op when
 * the path is unset or the config carries no sections (the action graph).
 */
export function persistSchema(config: SunroomConfig): void {
  const path = process.env.SUNROOM_SCHEMA_PATH;
  if (!path || persisted) return;
  if (Object.keys(config.sections).length === 0) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify(serializeRegistry(config)) + "\n",
      "utf8",
    );
    persisted = true;
  } catch {
    // Best-effort: a write failure must not crash the render path. The action
    // side fails closed (rejects saves) if the schema is missing.
  }
}
