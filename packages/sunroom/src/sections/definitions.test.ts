import { describe, expect, it, vi } from "vitest";
// index.tsx transitively imports Gallery/Hero which import next/image; neutralize
// it so this pure descriptor test loads under vitest (no package test uses
// next/image today, so it may not resolve at runtime here).
vi.mock("next/image", () => ({ default: () => null }));
import { gallerySection, heroSection, ctaSection } from "./index.js";

describe("section definitions", () => {
  it("gallerySection has the expected label + fields", () => {
    expect(gallerySection.label).toBe("Gallery");
    expect(Object.keys(gallerySection.fields)).toEqual(["title", "images"]);
    const images = gallerySection.fields.images as {
      type: string;
      itemLabel?: string;
    };
    expect(images.type).toBe("array");
    expect(images.itemLabel).toBe("Image");
  });
  it("heroSection matches the demo hero fields", () => {
    expect(heroSection.label).toBe("Hero");
    expect(Object.keys(heroSection.fields)).toEqual([
      "image",
      "text",
      "placement",
    ]);
    expect((heroSection.fields.image as { required?: boolean }).required).toBe(
      true,
    );
    expect((heroSection.fields.placement as { type: string }).type).toBe(
      "select",
    );
  });
  it("ctaSection matches the demo cta fields incl. showWhen", () => {
    expect(ctaSection.label).toBe("Call to action");
    expect(Object.keys(ctaSection.fields)).toEqual(["label", "action", "href"]);
    expect((ctaSection.fields.href as { showWhen?: unknown }).showWhen).toEqual(
      {
        field: "action",
        equals: "link",
      },
    );
  });
});
