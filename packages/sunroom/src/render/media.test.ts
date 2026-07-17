import { afterEach, describe, expect, it, vi } from "vitest";
import { f } from "../core/fields.js";
import type { MediaRecord } from "../store/types.js";
import { makeResolveMedia, resolveMediaInProps } from "./media.js";

const REC: MediaRecord = {
  id: "m1",
  storageKey: "uploads/m1.jpg",
  filename: "m1.jpg",
  mime: "image/jpeg",
  width: 800,
  height: 600,
  size: 1,
  alt: "A photo",
  createdAt: "x",
};

afterEach(() => vi.restoreAllMocks());

describe("makeResolveMedia", () => {
  it("composes the public URL and carries dimensions/alt", () => {
    const resolve = makeResolveMedia([REC], "https://cdn.example.com");
    expect(resolve("m1")).toEqual({
      url: "https://cdn.example.com/uploads/m1.jpg",
      width: 800,
      height: 600,
      alt: "A photo",
    });
  });
  it("strips a trailing slash on the base", () => {
    expect(makeResolveMedia([REC], "https://cdn.example.com/")("m1")?.url).toBe(
      "https://cdn.example.com/uploads/m1.jpg",
    );
  });
  it("returns undefined for a dangling id", () => {
    expect(
      makeResolveMedia([REC], "https://cdn.example.com")("nope"),
    ).toBeUndefined();
  });
  it("returns undefined and warns once when base is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolve = makeResolveMedia([REC], undefined);
    expect(resolve("m1")).toBeUndefined();
    expect(resolve("m1")).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1); // warned once, not per call
  });
});

describe("resolveMediaInProps", () => {
  const resolve = makeResolveMedia([REC], "https://cdn.example.com");

  it("resolves a top-level image field, leaves others untouched", () => {
    const fields = { heading: f.text(), photo: f.image() };
    expect(
      resolveMediaInProps(fields, { heading: "Hi", photo: "m1" }, resolve),
    ).toEqual({
      heading: "Hi",
      photo: {
        url: "https://cdn.example.com/uploads/m1.jpg",
        width: 800,
        height: 600,
        alt: "A photo",
      },
    });
  });
  it("resolves an image nested in an object", () => {
    const fields = { card: f.object({ img: f.image(), label: f.text() }) };
    const out = resolveMediaInProps(
      fields,
      { card: { img: "m1", label: "x" } },
      resolve,
    ) as any;
    expect(out.card.img.url).toContain("m1.jpg");
    expect(out.card.label).toBe("x");
  });
  it("resolves images inside an array", () => {
    const fields = { gallery: f.array(f.object({ img: f.image() })) };
    const out = resolveMediaInProps(
      fields,
      { gallery: [{ img: "m1" }, { img: "nope" }] },
      resolve,
    ) as any;
    expect(out.gallery[0].img.url).toContain("m1.jpg");
    expect(out.gallery[1].img).toBeUndefined(); // dangling → undefined
  });
  it("resolves a dangling top-level image to undefined", () => {
    expect(
      resolveMediaInProps({ photo: f.image() }, { photo: "nope" }, resolve),
    ).toEqual({ photo: undefined });
  });
  it("preserves unknown keys and non-string image values", () => {
    const out = resolveMediaInProps(
      { photo: f.image() },
      { photo: 42, extra: "keep" },
      resolve,
    );
    expect(out).toEqual({ photo: 42, extra: "keep" });
  });
});
