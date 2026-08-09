import { describe, expect, it } from "vitest";
import { findMediaUsage } from "./media-usage.js";
import type { Page, Settings } from "../store/types.js";

function page(over: Partial<Page> = {}): Page {
  return {
    slug: "home",
    title: "Home",
    position: 0,
    seo: {},
    sections: [],
    ...over,
  };
}
const settings: Settings = { seoDefaults: {}, redirects: [] };

describe("findMediaUsage", () => {
  it("finds an id in a top-level section prop", () => {
    const p = page({
      slug: "a",
      sections: [{ id: "s1", type: "hero", props: { image: "m1" } }],
    });
    expect(findMediaUsage([p], settings, "m1")).toEqual([
      { slug: "a", where: "section: hero" },
    ]);
  });

  it("finds an id nested in array/object props", () => {
    const p = page({
      slug: "b",
      sections: [
        {
          id: "s1",
          type: "carousel",
          props: { items: [{ image: "x" }, { image: "m2" }] },
        },
      ],
    });
    expect(findMediaUsage([p], settings, "m2")).toEqual([
      { slug: "b", where: "section: carousel" },
    ]);
  });

  it("finds ogImage and the site header image", () => {
    const p = page({ slug: "c", seo: { ogImage: "m3" } });
    const s: Settings = {
      seoDefaults: {},
      redirects: [],
      site: { header: { type: "image", image: "m4" } },
    };
    expect(findMediaUsage([p], s, "m3")).toEqual([
      { slug: "c", where: "SEO image" },
    ]);
    expect(findMediaUsage([p], s, "m4")).toEqual([
      { slug: "", where: "site header" },
    ]);
  });

  it("dedupes multiple hits within one section to a single entry", () => {
    const p = page({
      slug: "d",
      sections: [{ id: "s1", type: "gallery", props: { a: "m5", b: "m5" } }],
    });
    expect(findMediaUsage([p], settings, "m5")).toEqual([
      { slug: "d", where: "section: gallery" },
    ]);
  });

  it("returns [] for an unused id", () => {
    const p = page({
      slug: "e",
      sections: [{ id: "s1", type: "hero", props: { image: "m1" } }],
    });
    expect(findMediaUsage([p], settings, "zzz")).toEqual([]);
  });
});
