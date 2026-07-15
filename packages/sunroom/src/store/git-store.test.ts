import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { git } from "./git.js";
import { GitStore } from "./git-store.js";

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

  // TODO(Task 8): un-skip once GitStore#savePage exists (remove the
  // ts-expect-error suppressions below when it does).
  it.skip("sorts pages by position, then slug", async () => {
    const store = await freshStore();
    // @ts-expect-error savePage doesn't exist until Task 8.
    await store.savePage(
      { slug: "zebra", title: "Z", position: 1, seo: {}, sections: [] },
      { baseVersion: null, author: { name: "T", email: "t@e.com" } },
    );
    // @ts-expect-error savePage doesn't exist until Task 8.
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
