import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSchema, __resetSchemaCacheForTest } from "./schema-server.js";

describe("loadSchema", () => {
  beforeEach(() => __resetSchemaCacheForTest());
  afterEach(() => {
    delete process.env.SUNROOM_SCHEMA_PATH;
  });

  it("returns null when the path is unset", () => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    expect(loadSchema()).toBeNull();
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
