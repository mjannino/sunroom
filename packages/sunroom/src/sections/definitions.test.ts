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
  embedSection,
  proseSection,
  proseWithSidebarSection,
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
  it("embedSection has provider(select) + url + title", () => {
    expect(embedSection.label).toBe("Embedded player");
    expect(Object.keys(embedSection.fields)).toEqual([
      "provider",
      "url",
      "title",
    ]);
    const provider = embedSection.fields.provider as {
      type: string;
      options: { value: string }[];
    };
    expect(provider.type).toBe("select");
    expect(provider.options.map((o) => o.value)).toEqual([
      "spotify",
      "youtube",
      "soundcloud",
    ]);
  });
  it("proseSection has kicker + richText body", () => {
    expect(proseSection.label).toBe("Prose");
    expect(Object.keys(proseSection.fields)).toEqual(["kicker", "body"]);
    expect((proseSection.fields.body as { type: string }).type).toBe(
      "richText",
    );
  });

  it("proseWithSidebarSection adds a sidebar object with four fields", () => {
    expect(proseWithSidebarSection.label).toBe("Prose with sidebar");
    expect(Object.keys(proseWithSidebarSection.fields)).toEqual([
      "kicker",
      "body",
      "sidebar",
    ]);
    const sidebar = proseWithSidebarSection.fields.sidebar as {
      type: string;
      fields: Record<string, unknown>;
    };
    expect(sidebar.type).toBe("object");
    expect(Object.keys(sidebar.fields)).toEqual([
      "contactBlurb",
      "ctaLabel",
      "bookingHeading",
      "bookingBody",
    ]);
  });
});
