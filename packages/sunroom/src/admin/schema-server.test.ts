import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSchema, __resetSchemaCacheForTest } from "./schema-server.js";
import { resolveSchemaPath } from "./schema-path.js";

describe("loadSchema", () => {
  beforeEach(() => __resetSchemaCacheForTest());
  afterEach(() => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    delete process.env.SUNROOM_CONTENT_DIR;
  });

  it("returns null when the default schema file does not exist", () => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    // Point the content dir at an empty temp dir so the derived sibling path
    // has no schema file — the fail-closed path.
    process.env.SUNROOM_CONTENT_DIR = join(
      mkdtempSync(join(tmpdir(), "sunroom-content-")),
      ".sunroom-content",
    );
    expect(loadSchema()).toBeNull();
  });

  it("does not cache misses: a later write self-heals within the process", () => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    const contentDir = join(
      mkdtempSync(join(tmpdir(), "sunroom-content-")),
      ".sunroom-content",
    );
    process.env.SUNROOM_CONTENT_DIR = contentDir;
    // First call: no file yet → null, and this miss must NOT be cached.
    expect(loadSchema()).toBeNull();
    // Write a valid schema at the resolved path, then call again WITHOUT
    // resetting the cache. It must now return the schema.
    writeFileSync(
      resolveSchemaPath(contentDir),
      JSON.stringify({
        hero: { label: "Hero", fields: { heading: { type: "text" } } },
      }),
    );
    expect(loadSchema()?.hero?.fields.heading).toEqual({ type: "text" });
  });

  it("returns null when the file is missing", () => {
    process.env.SUNROOM_SCHEMA_PATH = join(tmpdir(), "does-not-exist.json");
    expect(loadSchema()).toBeNull();
  });

  it("reads the registry when present", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "sunroom-schema-")),
      "schema.json",
    );
    writeFileSync(
      path,
      JSON.stringify({
        hero: { label: "Hero", fields: { heading: { type: "text" } } },
      }),
    );
    process.env.SUNROOM_SCHEMA_PATH = path;
    expect(loadSchema()?.hero?.fields.heading).toEqual({ type: "text" });
  });

  it("returns null when the file contains malformed JSON", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "sunroom-schema-")),
      "schema.json",
    );
    writeFileSync(path, "{not valid json");
    process.env.SUNROOM_SCHEMA_PATH = path;
    expect(loadSchema()).toBeNull();
  });
});
