import { describe, expect, it, vi } from "vitest";
// index.tsx transitively imports Gallery/Hero which import next/image; neutralize
// it so this pure descriptor test loads under vitest (no package test uses
// next/image today, so it may not resolve at runtime here).
vi.mock("next/image", () => ({ default: () => null }));
import {
  gallerySection,
  heroSection,
  ctaSection,
  creditsGridSection,
  discographySection,
  carouselSection,
} from "./index.js";

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
  it("creditsGridSection has title + records(array of object)", () => {
    expect(creditsGridSection.label).toBe("Credits grid");
    expect(Object.keys(creditsGridSection.fields)).toEqual([
      "title",
      "records",
    ]);
    const records = creditsGridSection.fields.records as {
      type: string;
      of: { type: string; fields: Record<string, unknown> };
    };
    expect(records.type).toBe("array");
    expect(records.of.type).toBe("object");
    expect(Object.keys(records.of.fields)).toEqual([
      "cover",
      "band",
      "release",
    ]);
  });
  it("discographySection has title + entries(array) with itemLabel", () => {
    expect(discographySection.label).toBe("Discography list");
    expect(Object.keys(discographySection.fields)).toEqual([
      "title",
      "entries",
    ]);
    const entries = discographySection.fields.entries as {
      type: string;
      itemLabel?: string;
    };
    expect(entries.type).toBe("array");
    expect(entries.itemLabel).toBe("Entry");
  });
  it("carouselSection has title + items(array of object)", () => {
    expect(carouselSection.label).toBe("Carousel");
    expect(Object.keys(carouselSection.fields)).toEqual(["title", "items"]);
    const items = carouselSection.fields.items as {
      type: string;
      of: { type: string; fields: Record<string, unknown> };
    };
    expect(items.type).toBe("array");
    expect(Object.keys(items.of.fields)).toEqual(["image", "name", "note"]);
  });
});
