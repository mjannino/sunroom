import { describe, expect, it } from "vitest";
import { f } from "./fields.js";
import { validateProps } from "./validate.js";

describe("validateProps", () => {
  it("accepts valid props", () => {
    const fields = { heading: f.text({ required: true }), count: f.number() };
    expect(validateProps(fields, { heading: "Hi", count: 3 })).toEqual([]);
  });

  it("rejects a missing required field", () => {
    const fields = { heading: f.text({ required: true }) };
    expect(validateProps(fields, {})).toEqual([
      { path: "heading", message: "is required" },
    ]);
  });

  it("allows a missing optional field", () => {
    expect(validateProps({ body: f.richText() }, {})).toEqual([]);
  });

  it("rejects a wrong scalar type", () => {
    expect(validateProps({ count: f.number() }, { count: "three" })).toEqual([
      { path: "count", message: "expected a number" },
    ]);
  });

  it("rejects a select value outside its options", () => {
    const fields = {
      size: f.select({ options: [{ label: "Large", value: "lg" }] }),
    };
    expect(validateProps(fields, { size: "xl" })).toEqual([
      { path: "size", message: "expected one of: lg" },
    ]);
  });

  it("reports nested paths inside objects", () => {
    const fields = { cta: f.object({ href: f.link({ required: true }) }) };
    expect(validateProps(fields, { cta: {} })).toEqual([
      { path: "cta.href", message: "is required" },
    ]);
  });

  it("reports indexed paths inside arrays", () => {
    const fields = {
      quotes: f.array(f.object({ quote: f.text({ required: true }) })),
    };
    expect(validateProps(fields, { quotes: [{ quote: "a" }, {}] })).toEqual([
      { path: "quotes[1].quote", message: "is required" },
    ]);
  });

  it("rejects a non-array for an array field", () => {
    expect(
      validateProps({ quotes: f.array(f.text()) }, { quotes: "nope" }),
    ).toEqual([{ path: "quotes", message: "expected an array" }]);
  });

  it("ignores unknown keys so a renamed field does not destroy content", () => {
    expect(
      validateProps({ title: f.text() }, { title: "a", heading: "old value" }),
    ).toEqual([]);
  });

  it("rejects props that are not an object", () => {
    expect(validateProps({ a: f.text() }, null)).toEqual([
      { path: "", message: "expected an object" },
    ]);
  });
});
