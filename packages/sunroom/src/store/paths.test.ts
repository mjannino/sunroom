import { describe, expect, it } from "vitest";
import { contentVersion } from "./hash.js";
import {
  paramsToSlug,
  pathToSlug,
  slugToParams,
  slugToPath,
  validateSlug,
} from "./paths.js";

describe("slugToPath", () => {
  it("maps the home slug to pages/index.json", () => {
    expect(slugToPath("")).toBe("pages/index.json");
  });

  it("maps a simple slug", () => {
    expect(slugToPath("about")).toBe("pages/about.json");
  });

  it("mirrors nested slugs as nested paths", () => {
    expect(slugToPath("services/pricing")).toBe("pages/services/pricing.json");
  });
});

describe("pathToSlug", () => {
  it("round-trips every slugToPath result", () => {
    for (const slug of ["", "about", "services/pricing"]) {
      expect(pathToSlug(slugToPath(slug))).toBe(slug);
    }
  });
});

describe("params mapping", () => {
  it("treats an absent catch-all param as the home page", () => {
    expect(paramsToSlug(undefined)).toBe("");
    expect(paramsToSlug([])).toBe("");
  });

  it("joins segments", () => {
    expect(paramsToSlug(["services", "pricing"])).toBe("services/pricing");
  });

  it("round-trips", () => {
    for (const slug of ["", "about", "services/pricing"]) {
      expect(paramsToSlug(slugToParams(slug))).toBe(slug);
    }
  });
});

describe("validateSlug", () => {
  it("accepts the home slug", () => {
    expect(validateSlug("")).toEqual([]);
  });

  it("accepts kebab-case segments", () => {
    expect(validateSlug("about-us")).toEqual([]);
    expect(validateSlug("services/web-design")).toEqual([]);
  });

  it("rejects reserved first segments so a client cannot shadow their own CMS", () => {
    expect(validateSlug("admin")).toEqual([
      { path: "slug", message: '"admin" is a reserved slug' },
    ]);
    expect(validateSlug("api/things")).toEqual([
      { path: "slug", message: '"api" is a reserved slug' },
    ]);
  });

  it("rejects uppercase, spaces, and path traversal", () => {
    expect(validateSlug("About")).toHaveLength(1);
    expect(validateSlug("two words")).toHaveLength(1);
    expect(validateSlug("../etc/passwd")).not.toEqual([]);
    expect(validateSlug("a//b")).not.toEqual([]);
  });
});

describe("contentVersion", () => {
  it("is stable and differs on change", () => {
    expect(contentVersion("a")).toBe(contentVersion("a"));
    expect(contentVersion("a")).not.toBe(contentVersion("b"));
    expect(contentVersion("a")).toHaveLength(16);
  });
});
