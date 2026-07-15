import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../core/registry.js";
import { getStore, resetStores } from "./singleton.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-singleton-"));
  resetStores();
});

afterEach(async () => {
  resetStores();
  await rm(dir, { recursive: true, force: true });
});

describe("getStore", () => {
  it("returns the same initialised store for the same content dir", async () => {
    const config = resolveConfig({ contentDir: dir, sections: {} });
    const [a, b] = await Promise.all([getStore(config), getStore(config)]);
    expect(a).toBe(b);
    expect(a.listPages()).toEqual([{ slug: "", title: "Home", position: 0 }]);
  });
});
