import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSunroom } from "./sunroom.js";
import { getStore, resetStores } from "./store/singleton.js";
import { resolveConfig } from "./core/registry.js";
import { SYSTEM_AUTHOR } from "./store/git-store.js";

let dir: string;
beforeEach(async () => {
  dir = join(
    await mkdtemp(join(tmpdir(), "sunroom-getset-")),
    ".sunroom-content",
  );
  process.env.SUNROOM_CONTENT_DIR = dir;
  resetStores();
});
afterEach(async () => {
  resetStores();
  delete process.env.SUNROOM_CONTENT_DIR;
  delete process.env.R2_PUBLIC_BASE;
  await rm(dir, { recursive: true, force: true }).catch(() => {});
});

describe("sunroom.getSettings", () => {
  it("returns the site name and defaults the header to text", async () => {
    const sr = createSunroom({ sections: {} });
    const store = await getStore(resolveConfig({ sections: {} }));
    await store.saveSettings(
      { seoDefaults: {}, site: { name: "Mara Voss" }, redirects: [] },
      { author: SYSTEM_AUTHOR },
    );
    const s = await sr.getSettings();
    expect(s.name).toBe("Mara Voss");
    expect(s.header).toEqual({ type: "text" });
  });

  it("resolves an image header id to a public URL", async () => {
    process.env.R2_PUBLIC_BASE = "https://cdn.example.com";
    const sr = createSunroom({ sections: {} });
    const store = await getStore(resolveConfig({ sections: {} }));
    await store.addMedia(
      {
        id: "logo",
        storageKey: "uploads/logo.png",
        filename: "logo.png",
        mime: "image/png",
        width: 200,
        height: 60,
        size: 1,
        alt: "",
        createdAt: "2026-01-01T00:00:00Z",
      },
      { author: SYSTEM_AUTHOR },
    );
    await store.saveSettings(
      {
        seoDefaults: {},
        site: { name: "X", header: { type: "image", image: "logo" } },
        redirects: [],
      },
      { author: SYSTEM_AUTHOR },
    );
    const s = await sr.getSettings();
    expect(s.header.type).toBe("image");
    expect(s.header.imageUrl).toBe("https://cdn.example.com/uploads/logo.png");
  });
});
