import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  persistSchema,
  __resetSchemaPersistedForTest,
} from "./schema-persist.js";
import { resolveSchemaPath } from "./schema-path.js";
import { resolveConfig } from "../core/registry.js";
import { f } from "../core/fields.js";

function dummy() {
  return null;
}

describe("persistSchema", () => {
  let path: string;
  beforeEach(() => {
    path = join(mkdtempSync(join(tmpdir(), "sunroom-schema-")), "schema.json");
    process.env.SUNROOM_SCHEMA_PATH = path;
    __resetSchemaPersistedForTest();
  });
  afterEach(() => {
    delete process.env.SUNROOM_SCHEMA_PATH;
  });

  it("writes the serialized registry (fields only, no components)", () => {
    const config = resolveConfig({
      sections: {
        hero: {
          label: "Hero",
          component: dummy,
          fields: { heading: f.text() },
        },
      },
    });
    persistSchema(config);
    const written = JSON.parse(readFileSync(path, "utf8"));
    expect(written.hero.fields.heading).toEqual({ type: "text" });
    expect(written.hero.component).toBeUndefined();
  });

  it("writes to the default sibling path when SUNROOM_SCHEMA_PATH is unset", () => {
    delete process.env.SUNROOM_SCHEMA_PATH;
    const contentDir = join(
      mkdtempSync(join(tmpdir(), "sunroom-content-")),
      ".sunroom-content",
    );
    const config = resolveConfig({
      contentDir,
      sections: {
        hero: {
          label: "Hero",
          component: dummy,
          fields: { heading: f.text() },
        },
      },
    });
    persistSchema(config);
    const expected = resolveSchemaPath(config.contentDir);
    // The schema lands OUTSIDE the content dir (a sibling), so the store's
    // `git clean -fd` recovery never wipes it.
    expect(dirname(expected)).not.toBe(config.contentDir);
    const written = JSON.parse(readFileSync(expected, "utf8"));
    expect(written.hero.fields.heading).toEqual({ type: "text" });
  });

  it("does nothing when sections is empty (the server-action graph)", () => {
    persistSchema(resolveConfig({ sections: {} }));
    expect(() => readFileSync(path, "utf8")).toThrow(); // file not created
  });
});
