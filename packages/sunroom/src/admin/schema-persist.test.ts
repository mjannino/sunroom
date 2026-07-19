import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistSchema, __resetSchemaPersistedForTest } from "./schema-persist.js";
import { resolveConfig } from "../core/registry.js";
import { f } from "../core/fields.js";

function dummy() { return null; }

describe("persistSchema", () => {
  let path: string;
  beforeEach(() => {
    path = join(mkdtempSync(join(tmpdir(), "sunroom-schema-")), "schema.json");
    process.env.SUNROOM_SCHEMA_PATH = path;
    __resetSchemaPersistedForTest();
  });
  afterEach(() => { delete process.env.SUNROOM_SCHEMA_PATH; });

  it("writes the serialized registry (fields only, no components)", () => {
    const config = resolveConfig({
      sections: { hero: { label: "Hero", component: dummy, fields: { heading: f.text() } } },
    });
    persistSchema(config);
    const written = JSON.parse(readFileSync(path, "utf8"));
    expect(written.hero.fields.heading).toEqual({ type: "text" });
    expect(written.hero.component).toBeUndefined();
  });

  it("does nothing when SUNROOM_SCHEMA_PATH is unset", () => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    expect(() => persistSchema(resolveConfig({ sections: {} }))).not.toThrow();
  });

  it("does nothing when sections is empty (the server-action graph)", () => {
    persistSchema(resolveConfig({ sections: {} }));
    expect(() => readFileSync(path, "utf8")).toThrow(); // file not created
  });
});
