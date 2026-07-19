import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";

// Wraps the real `git` helper so tests can assert on the exact argv it was
// called with (e.g. `gc --auto` on init) while every other test in this file
// still exercises the real git binary end to end.
const { gitSpy } = vi.hoisted(() => ({ gitSpy: vi.fn() }));
vi.mock("./git.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./git.js")>();
  return {
    ...actual,
    git: (...args: Parameters<typeof actual.git>) => {
      gitSpy(...args);
      return actual.git(...args);
    },
  };
});

import { git } from "./git.js";
import { GitStore } from "./git-store.js";
import type { Page } from "./types.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-store-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function freshStore(): Promise<GitStore> {
  const store = new GitStore(dir);
  await store.init();
  return store;
}

describe("init on an empty directory", () => {
  it("creates a repo with a home page and settings", async () => {
    const store = await freshStore();

    expect(await git(dir, ["rev-parse", "--abbrev-ref", "HEAD"])).toBe("main");
    expect(store.listPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
    ]);
    expect(store.getSettings()).toEqual({ seoDefaults: {}, redirects: [] });

    const home = store.getPage("");
    expect(home?.page.sections).toEqual([]);
    expect(home?.version).toHaveLength(16);
  });

  it("leaves a clean working tree", async () => {
    await freshStore();
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
  });

  it("is idempotent", async () => {
    await freshStore();
    const before = await git(dir, ["rev-parse", "HEAD"]);
    await freshStore();
    expect(await git(dir, ["rev-parse", "HEAD"])).toBe(before);
  });

  it("runs git gc --auto after loading, to keep the repo compact", async () => {
    gitSpy.mockClear();
    const store = new GitStore(dir);
    await expect(store.init()).resolves.toBeUndefined();
    expect(gitSpy).toHaveBeenCalledWith(dir, ["gc", "--auto"]);
  });
});

describe("init on an existing repo", () => {
  it("loads pages from disk into the index", async () => {
    await freshStore();

    const about = {
      slug: "about",
      title: "About Us",
      position: 1,
      seo: {},
      sections: [{ id: "sec_1", type: "hero", props: { heading: "Hi" } }],
    };
    await writeFile(
      join(dir, "pages", "about.json"),
      JSON.stringify(about, null, 2) + "\n",
    );
    await git(dir, ["add", "-A"]);
    await git(dir, [
      "-c",
      "user.name=T",
      "-c",
      "user.email=t@e.com",
      "commit",
      "-m",
      "add about",
    ]);

    const store = await freshStore();
    expect(store.listPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
      { slug: "about", title: "About Us", position: 1 },
    ]);
    expect(store.getPage("about")?.page.sections[0]?.props).toEqual({
      heading: "Hi",
    });
  });

  it("sorts pages by position, then slug", async () => {
    const store = await freshStore();
    await store.savePage(
      { slug: "zebra", title: "Z", position: 1, seo: {}, sections: [] },
      { baseVersion: null, author: { name: "T", email: "t@e.com" } },
    );
    await store.savePage(
      { slug: "apple", title: "A", position: 1, seo: {}, sections: [] },
      { baseVersion: null, author: { name: "T", email: "t@e.com" } },
    );
    expect(store.listPages().map((p) => p.slug)).toEqual([
      "",
      "apple",
      "zebra",
    ]);
  });
});

describe("recovery from a crashed save", () => {
  it("discards uncommitted debris in the working tree on boot", async () => {
    await freshStore();

    // Simulate a process killed between writing the file and committing it.
    await writeFile(join(dir, "pages", "ghost.json"), '{"slug":"ghost"}\n');
    await writeFile(join(dir, "pages", "index.json"), '{"corrupt": true}\n');
    await writeFile(join(dir, "pages", "about.json.tmp-123-456"), "garbage");

    const store = await freshStore();

    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(store.listPages().map((p) => p.slug)).toEqual([""]);
    expect(store.getPage("")?.page.title).toBe("Home");

    const home = await readFile(join(dir, "pages", "index.json"), "utf8");
    expect(JSON.parse(home).title).toBe("Home");
  });
});

describe("getPage", () => {
  it("returns null for an unknown slug", async () => {
    const store = await freshStore();
    expect(store.getPage("nope")).toBeNull();
  });
});

const AUTHOR = { name: "Jane Doe", email: "jane@acme.com" };

function page(overrides: Partial<Page> = {}): Page {
  return {
    slug: "about",
    title: "About Us",
    position: 1,
    seo: {},
    sections: [{ id: "sec_1", type: "hero", props: { heading: "Hello" } }],
    ...overrides,
  };
}

describe("savePage", () => {
  it("creates a page, commits it, and returns a version", async () => {
    const store = await freshStore();
    const saved = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    expect(saved.version).toHaveLength(16);
    expect(store.getPage("about")?.page.title).toBe("About Us");
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Create about");
    expect(await git(dir, ["log", "-1", "--format=%an <%ae>"])).toBe(
      "Jane Doe <jane@acme.com>",
    );
  });

  it("writes the page to its slug-derived path", async () => {
    const store = await freshStore();
    await store.savePage(page({ slug: "services/pricing" }), {
      baseVersion: null,
      author: AUTHOR,
    });
    const raw = await readFile(
      join(dir, "pages", "services", "pricing.json"),
      "utf8",
    );
    expect(JSON.parse(raw).title).toBe("About Us");
  });

  it("updates an existing page when given its current version", async () => {
    const store = await freshStore();
    const first = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    const second = await store.savePage(page({ title: "Renamed" }), {
      baseVersion: first.version,
      author: AUTHOR,
    });

    expect(second.version).not.toBe(first.version);
    expect(store.getPage("about")?.page.title).toBe("Renamed");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Update about");
  });

  it("rejects a stale version instead of clobbering", async () => {
    const store = await freshStore();
    const first = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });
    await store.savePage(page({ title: "Renamed by someone else" }), {
      baseVersion: first.version,
      author: AUTHOR,
    });

    await expect(
      store.savePage(page({ title: "My edit" }), {
        baseVersion: first.version,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ConflictError);

    expect(store.getPage("about")?.page.title).toBe("Renamed by someone else");
  });

  it("rejects creating a page that already exists", async () => {
    const store = await freshStore();
    await store.savePage(page(), { baseVersion: null, author: AUTHOR });
    await expect(
      store.savePage(page(), { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow(ConflictError);
  });

  it("rejects a reserved slug", async () => {
    const store = await freshStore();
    await expect(
      store.savePage(page({ slug: "admin" }), {
        baseVersion: null,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ValidationError);
    expect(existsSync(join(dir, "pages", "admin.json"))).toBe(false);
  });

  it("rejects a slug that would escape the content directory", async () => {
    const store = await freshStore();
    await expect(
      store.savePage(page({ slug: "../../etc/passwd" }), {
        baseVersion: null,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects duplicate section ids", async () => {
    const store = await freshStore();
    const bad = page({
      sections: [
        { id: "dup", type: "hero", props: {} },
        { id: "dup", type: "hero", props: {} },
      ],
    });
    await expect(
      store.savePage(bad, { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow(ValidationError);
  });

  it("serialises concurrent saves instead of interleaving them", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    // Both start from the same base version. One must win; the other must conflict.
    const results = await Promise.allSettled([
      store.savePage(page({ title: "A" }), {
        baseVersion: created.version,
        author: AUTHOR,
      }),
      store.savePage(page({ title: "B" }), {
        baseVersion: created.version,
        author: AUTHOR,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConflictError,
    );
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
  });

  it("saving byte-identical content is a no-op: returns the same version and creates NO new commit", async () => {
    const store = await freshStore();
    const first = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    const countBefore = await git(dir, ["rev-list", "--count", "HEAD"]);

    const second = await store.savePage(page(), {
      baseVersion: first.version,
      author: AUTHOR,
    });

    expect(second.version).toBe(first.version);
    expect(await git(dir, ["rev-list", "--count", "HEAD"])).toBe(countBefore);
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(store.getPage("about")?.page.title).toBe("About Us");
  });

  it("leaves no partial state when the commit fails", async () => {
    const store = await freshStore();
    const before = store.getPage("");

    // Break the repo so `git commit` cannot succeed.
    await rm(join(dir, ".git"), { recursive: true, force: true });

    await expect(
      store.savePage(page(), { baseVersion: null, author: AUTHOR }),
    ).rejects.toThrow();

    // The in-memory index must not have absorbed the failed write.
    expect(store.getPage("about")).toBeNull();
    expect(store.getPage("")?.version).toBe(before?.version);
  });
});

describe("deletePage", () => {
  it("removes the file, commits, and drops it from the index", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });

    await store.deletePage("about", {
      baseVersion: created.version,
      author: AUTHOR,
    });

    expect(store.getPage("about")).toBeNull();
    expect(existsSync(join(dir, "pages", "about.json"))).toBe(false);
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Delete about");
  });

  it("refuses to delete the home page", async () => {
    const store = await freshStore();
    const home = store.getPage("");
    await expect(
      store.deletePage("", { baseVersion: home!.version, author: AUTHOR }),
    ).rejects.toThrow(ValidationError);
    expect(store.getPage("")).not.toBeNull();
  });

  it("throws NotFoundError for an unknown slug", async () => {
    const store = await freshStore();
    await expect(
      store.deletePage("ghost", { baseVersion: "whatever", author: AUTHOR }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects an invalid slug before touching the filesystem", async () => {
    const store = await freshStore();
    await expect(
      store.deletePage("../evil", { baseVersion: "x", author: AUTHOR }),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects a stale version", async () => {
    const store = await freshStore();
    const created = await store.savePage(page(), {
      baseVersion: null,
      author: AUTHOR,
    });
    await store.savePage(page({ title: "Changed" }), {
      baseVersion: created.version,
      author: AUTHOR,
    });

    await expect(
      store.deletePage("about", {
        baseVersion: created.version,
        author: AUTHOR,
      }),
    ).rejects.toThrow(ConflictError);
    expect(store.getPage("about")).not.toBeNull();
  });
});

describe("saveSettings", () => {
  it("persists and commits settings", async () => {
    const store = await freshStore();
    await store.saveSettings(
      { seoDefaults: { description: "A lovely business" }, redirects: [] },
      { author: AUTHOR },
    );

    expect(store.getSettings().seoDefaults.description).toBe(
      "A lovely business",
    );
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe(
      "Update settings",
    );

    const reloaded = await freshStore();
    expect(reloaded.getSettings().seoDefaults.description).toBe(
      "A lovely business",
    );
  });
});

const MEDIA_AUTHOR = { name: "Jane", email: "jane@acme.com" };

function media(overrides: Partial<import("./types.js").MediaRecord> = {}) {
  return {
    id: "m1",
    storageKey: "uploads/m1.jpg",
    filename: "m1.jpg",
    mime: "image/jpeg",
    width: 800,
    height: 600,
    size: 1234,
    alt: "A photo",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("media", () => {
  it("starts empty and creates media/index.json on init", async () => {
    const store = await freshStore();
    expect(store.listMedia()).toEqual([]);
    // the file exists (a subsequent boot loads it)
    const reloaded = await freshStore();
    expect(reloaded.listMedia()).toEqual([]);
  });

  it("adds a media record, commits, and persists across reload", async () => {
    const store = await freshStore();
    await store.addMedia(media(), { author: MEDIA_AUTHOR });
    expect(store.getMedia("m1")?.alt).toBe("A photo");
    expect(store.listMedia().map((m) => m.id)).toEqual(["m1"]);
    expect(await git(dir, ["log", "-1", "--format=%s"])).toBe("Add media m1");

    const reloaded = await freshStore();
    expect(reloaded.getMedia("m1")?.storageKey).toBe("uploads/m1.jpg");
  });

  it("returns null for an unknown media id", async () => {
    const store = await freshStore();
    expect(store.getMedia("nope")).toBeNull();
  });

  it("deletes a media record and commits", async () => {
    const store = await freshStore();
    await store.addMedia(media(), { author: MEDIA_AUTHOR });
    await store.deleteMedia("m1", { author: MEDIA_AUTHOR });
    expect(store.getMedia("m1")).toBeNull();
    expect(store.listMedia()).toEqual([]);
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
  });

  it("deleting an id that isn't present is a no-op: no throw, no new commit", async () => {
    const store = await freshStore();
    const countBefore = await git(dir, ["rev-list", "--count", "HEAD"]);

    await expect(
      store.deleteMedia("nope", { author: MEDIA_AUTHOR }),
    ).resolves.toBeUndefined();

    expect(await git(dir, ["rev-list", "--count", "HEAD"])).toBe(countBefore);
    expect(await git(dir, ["status", "--porcelain"])).toBe("");
    expect(store.listMedia()).toEqual([]);
  });
});
