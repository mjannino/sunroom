import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { f } from "./core/fields.js";
import { defineSection } from "./core/registry.js";
import { GitStore } from "./store/git-store.js";
import { resetStores } from "./store/singleton.js";
import { createSunroom } from "./sunroom.js";

function Hero({ heading }: { heading: string }) {
  return <h1>{heading}</h1>;
}

const AUTHOR = { name: "T", email: "t@e.com" };

let root: string;
let dir: string;

async function seed() {
  const store = new GitStore(dir);
  await store.init();

  const home = store.getPage("")!;
  await store.savePage(
    {
      slug: "",
      title: "Home",
      position: 0,
      seo: {},
      sections: [{ id: "s1", type: "hero", props: { heading: "Welcome" } }],
    },
    { baseVersion: home.version, author: AUTHOR },
  );

  await store.savePage(
    {
      slug: "about",
      title: "About Us",
      position: 1,
      seo: { title: "About | Acme", description: "Who we are" },
      sections: [{ id: "s2", type: "hero", props: { heading: "About" } }],
    },
    { baseVersion: null, author: AUTHOR },
  );
}

function sunroom() {
  return createSunroom({
    contentDir: dir,
    sections: {
      hero: defineSection({
        label: "Hero",
        component: Hero,
        fields: { heading: f.text({ required: true }) },
      }),
    },
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sunroom-next-"));
  dir = join(root, ".sunroom-content");
  resetStores();
  await seed();
});

afterEach(async () => {
  resetStores();
  // `root` also holds the default sibling schema file persistSchema() writes
  // (a sibling of `dir`), so removing `root` cleans that up too instead of
  // leaking it into the shared OS temp root.
  await rm(root, { recursive: true, force: true });
});

describe("generateStaticParams", () => {
  it("returns a param entry per page, with the home page as an empty segment list", async () => {
    const params = await sunroom().generateStaticParams();
    expect(params).toEqual([{ slug: [] }, { slug: ["about"] }]);
  });
});

describe("Page", () => {
  it("renders the home page for an absent slug param", async () => {
    const element = await sunroom().Page({ params: Promise.resolve({}) });
    expect(renderToStaticMarkup(element)).toBe("<h1>Welcome</h1>");
  });

  it("renders a page by slug", async () => {
    const element = await sunroom().Page({
      params: Promise.resolve({ slug: ["about"] }),
    });
    expect(renderToStaticMarkup(element)).toBe("<h1>About</h1>");
  });

  it("calls notFound() for an unknown slug", async () => {
    // Next's notFound() signals by throwing.
    await expect(
      sunroom().Page({ params: Promise.resolve({ slug: ["ghost"] }) }),
    ).rejects.toThrow();
  });
});

describe("generateMetadata", () => {
  it("prefers the page seo title, falling back to the page title", async () => {
    const s = sunroom();
    expect(
      await s.generateMetadata({
        params: Promise.resolve({ slug: ["about"] }),
      }),
    ).toEqual({
      title: "About | Acme",
      description: "Who we are",
    });
    expect(await s.generateMetadata({ params: Promise.resolve({}) })).toEqual({
      title: "Home",
      description: undefined,
    });
  });

  it("returns empty metadata for an unknown slug", async () => {
    expect(
      await sunroom().generateMetadata({
        params: Promise.resolve({ slug: ["ghost"] }),
      }),
    ).toEqual({});
  });

  it("resolves seo.ogImage to a public URL in metadata", async () => {
    process.env.R2_PUBLIC_BASE = "https://cdn.example.com";
    const store = new GitStore(dir);
    await store.init();
    await store.addMedia(
      {
        id: "og1",
        storageKey: "og/og1.png",
        filename: "og1.png",
        mime: "image/png",
        width: 1200,
        height: 630,
        size: 1,
        alt: "OG",
        createdAt: "x",
      },
      { author: AUTHOR },
    );
    const home = store.getPage("")!;
    await store.savePage(
      { ...home.page, seo: { ...home.page.seo, ogImage: "og1" } },
      { baseVersion: home.version, author: AUTHOR },
    );
    resetStores();

    const meta = await sunroom().generateMetadata({
      params: Promise.resolve({}),
    });
    expect(JSON.stringify(meta)).toContain(
      "https://cdn.example.com/og/og1.png",
    );
    delete process.env.R2_PUBLIC_BASE;
  });
});

describe("escape hatches", () => {
  it("getPages returns the ordered page list for a bespoke nav", async () => {
    expect(await sunroom().getPages()).toEqual([
      { slug: "", title: "Home", position: 0 },
      { slug: "about", title: "About Us", position: 1 },
    ]);
  });

  it("getPage returns a page, or null", async () => {
    const s = sunroom();
    expect((await s.getPage("about"))?.title).toBe("About Us");
    expect(await s.getPage("ghost")).toBeNull();
  });
});
