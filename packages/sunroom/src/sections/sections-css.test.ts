import { describe, expect, it } from "vitest";
import { SECTIONS_CSS } from "./sections-css.js";

describe("SECTIONS_CSS", () => {
  it("defines a block for every packaged section", () => {
    for (const sel of [
      ".srs-creditsgrid",
      ".srs-discography",
      ".srs-carousel",
      ".srs-embed",
      ".srs-prose",
    ]) {
      expect(SECTIONS_CSS).toContain(sel);
    }
  });

  it("themes the new color/font roles via --sr-* tokens with fallbacks", () => {
    for (const token of [
      "var(--sr-surface,",
      "var(--sr-border,",
      "var(--sr-font-heading,",
      "var(--sr-font-prose,",
    ]) {
      expect(SECTIONS_CSS).toContain(token);
    }
  });

  it("does not leak collapsed palette variables", () => {
    expect(SECTIONS_CSS).not.toContain("--sr-faint");
    expect(SECTIONS_CSS).not.toContain("--sr-accent-soft");
    expect(SECTIONS_CSS).not.toContain("#ff6f52,#ff6f52"); // no double-token typos
  });
});
