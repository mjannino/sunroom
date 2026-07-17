import { describe, expect, it } from "vitest";
import { f } from "../core/fields.js";
import type { Page } from "../store/types.js";
import {
  defaultProps,
  editReducer,
  screenFromSegments,
  serializeRegistry,
  editorValidate,
  defaultForField,
  MAX_FIELD_DEPTH,
} from "./editor-core.js";

describe("defaultProps", () => {
  it("produces type-appropriate defaults and honours declared defaults", () => {
    const fields = {
      heading: f.text({ required: true }),
      note: f.textarea(),
      count: f.number({ default: 3 }),
      flag: f.boolean(),
      size: f.select({ options: [{ label: "L", value: "lg" }] }),
      cta: f.object({ label: f.text() }),
      quotes: f.array(f.text()),
    };
    expect(defaultProps(fields)).toEqual({
      heading: "",
      note: "",
      count: 3,
      flag: false,
      size: "lg",
      cta: { label: "" },
      quotes: [],
    });
  });
});

describe("defaultForField (exported) + depth cap", () => {
  it("is exported and returns type defaults", () => {
    expect(defaultForField(f.text())).toBe("");
    expect(defaultForField(f.number())).toBe(0);
    expect(defaultForField(f.array(f.text()))).toEqual([]);
  });

  it("MAX_FIELD_DEPTH is 5", () => {
    expect(MAX_FIELD_DEPTH).toBe(5);
  });

  it("throws on a too-deep / circular descriptor instead of infinite-looping", () => {
    // Build a 7-level-deep nested object schema (exceeds the cap).
    let deep: any = f.object({ leaf: f.text() });
    for (let i = 0; i < 7; i++) deep = f.object({ child: deep });
    expect(() => defaultProps({ root: deep })).toThrow(/depth/i);
  });
});

describe("editorValidate", () => {
  it("flags a required text left empty (which validateProps alone would pass)", () => {
    const fields = { heading: f.text({ required: true }) };
    expect(editorValidate(fields, { heading: "" })).toEqual([
      { path: "heading", message: "is required" },
    ]);
    expect(editorValidate(fields, { heading: "Hi" })).toEqual([]);
  });

  it("flags a required array left empty", () => {
    const fields = { quotes: f.array(f.text(), { required: true }) };
    expect(editorValidate(fields, { quotes: [] })).toEqual([
      { path: "quotes", message: "is required" },
    ]);
    expect(editorValidate(fields, { quotes: ["a"] })).toEqual([]);
  });

  it("still surfaces validateProps type errors", () => {
    const fields = { count: f.number() };
    expect(editorValidate(fields, { count: "nope" })).toEqual([
      { path: "count", message: "expected a number" },
    ]);
  });

  it("flags a required field empty inside a nested object", () => {
    const fields = { cta: f.object({ href: f.link({ required: true }) }) };
    expect(editorValidate(fields, { cta: { href: "" } })).toEqual([
      { path: "cta.href", message: "is required" },
    ]);
  });

  it("flags a required field empty inside an array item", () => {
    const fields = {
      quotes: f.array(f.object({ author: f.text({ required: true }) })),
    };
    expect(editorValidate(fields, { quotes: [{ author: "" }] })).toEqual([
      { path: "quotes[0].author", message: "is required" },
    ]);
  });

  it("does not double-report a missing key (validateProps wins)", () => {
    const fields = { heading: f.text({ required: true }) };
    const issues = editorValidate(fields, {});
    expect(issues.filter((i) => i.path === "heading")).toHaveLength(1);
  });

  it("treats 0 and false as present (not empty)", () => {
    const fields = {
      count: f.number({ required: true }),
      flag: f.boolean({ required: true }),
    };
    expect(editorValidate(fields, { count: 0, flag: false })).toEqual([]);
  });
});

describe("serializeRegistry", () => {
  it("drops the React components, keeps label/thumbnail/fields", () => {
    const config = {
      contentDir: "/x",
      sections: {
        hero: {
          label: "Hero",
          component: () => null,
          fields: { heading: f.text() },
          thumbnail: "/h.png",
        },
      },
    };
    expect(serializeRegistry(config)).toEqual({
      hero: {
        label: "Hero",
        thumbnail: "/h.png",
        deprecated: undefined,
        fields: { heading: { type: "text" } },
      },
    });
  });
});

describe("screenFromSegments", () => {
  it("maps segments to a screen", () => {
    expect(screenFromSegments(undefined)).toEqual({ screen: "pages" });
    expect(screenFromSegments([])).toEqual({ screen: "pages" });
    expect(screenFromSegments(["pages"])).toEqual({
      screen: "editor",
      slug: "",
    });
    expect(screenFromSegments(["pages", "about"])).toEqual({
      screen: "editor",
      slug: "about",
    });
    expect(screenFromSegments(["pages", "services", "pricing"])).toEqual({
      screen: "editor",
      slug: "services/pricing",
    });
  });
});

describe("editReducer", () => {
  const base: Page = {
    slug: "about",
    title: "About",
    position: 1,
    seo: {},
    sections: [
      { id: "s1", type: "hero", props: { heading: "Hi" } },
      { id: "s2", type: "quote", props: { text: "Q" } },
    ],
  };

  it("sets a section field without touching others", () => {
    const next = editReducer(base, {
      type: "setSectionField",
      sectionId: "s1",
      key: "heading",
      value: "Yo",
    });
    expect(next.sections[0]!.props).toEqual({ heading: "Yo" });
    expect(next.sections[1]).toBe(base.sections[1]); // untouched reference
    expect(base.sections[0]!.props.heading).toBe("Hi"); // original not mutated
  });

  it("sets page fields including nested seo", () => {
    expect(
      editReducer(base, {
        type: "setPageField",
        key: "title",
        value: "About Us",
      }).title,
    ).toBe("About Us");
    expect(
      editReducer(base, { type: "setPageField", key: "seo.title", value: "T" })
        .seo.title,
    ).toBe("T");
    expect(
      editReducer(base, {
        type: "setPageField",
        key: "seo.description",
        value: "D",
      }).seo.description,
    ).toBe("D");
  });

  it("adds a section with given id and props at the end", () => {
    const next = editReducer(base, {
      type: "addSection",
      sectionType: "hero",
      id: "s3",
      props: { heading: "" },
    });
    expect(next.sections.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(next.sections[2]).toEqual({
      id: "s3",
      type: "hero",
      props: { heading: "" },
    });
  });

  it("removes a section", () => {
    expect(
      editReducer(base, {
        type: "removeSection",
        sectionId: "s1",
      }).sections.map((s) => s.id),
    ).toEqual(["s2"]);
  });

  it("moves a section up and down within bounds", () => {
    expect(
      editReducer(base, {
        type: "moveSection",
        sectionId: "s2",
        dir: "up",
      }).sections.map((s) => s.id),
    ).toEqual(["s2", "s1"]);
    expect(
      editReducer(base, {
        type: "moveSection",
        sectionId: "s1",
        dir: "up",
      }).sections.map((s) => s.id),
    ).toEqual(["s1", "s2"]); // no-op at top
    expect(
      editReducer(base, {
        type: "moveSection",
        sectionId: "s2",
        dir: "down",
      }).sections.map((s) => s.id),
    ).toEqual(["s1", "s2"]); // no-op at bottom
  });
});

describe("editReducer reorderSections", () => {
  const base = {
    slug: "p",
    title: "P",
    position: 1,
    seo: {},
    sections: [
      { id: "s1", type: "hero", props: {} },
      { id: "s2", type: "quote", props: {} },
      { id: "s3", type: "cta", props: {} },
    ],
  };
  it("reorders sections to match orderedIds", () => {
    const next = editReducer(base, {
      type: "reorderSections",
      orderedIds: ["s3", "s1", "s2"],
    });
    expect(next.sections.map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
    expect(base.sections.map((s) => s.id)).toEqual(["s1", "s2", "s3"]); // input not mutated
  });
  it("ignores unknown ids and keeps unlisted sections at the end", () => {
    const next = editReducer(base, {
      type: "reorderSections",
      orderedIds: ["s2", "nope"],
    });
    expect(next.sections.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
  });
});
