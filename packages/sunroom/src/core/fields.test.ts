import { describe, expect, expectTypeOf, it } from "vitest";
import { f } from "./fields.js";
import type { ImageValue, InferFields } from "./fields.js";

describe("f builders", () => {
  it("produces plain serializable descriptors", () => {
    expect(f.text({ label: "Heading", required: true })).toEqual({
      type: "text",
      label: "Heading",
      required: true,
    });
    expect(f.number()).toEqual({ type: "number" });
    expect(f.select({ options: [{ label: "A", value: "a" }] })).toEqual({
      type: "select",
      options: [{ label: "A", value: "a" }],
    });
  });

  it("nests object and array descriptors", () => {
    const d = f.array(f.object({ quote: f.text(), author: f.text() }));
    expect(d).toEqual({
      type: "array",
      of: {
        type: "object",
        fields: { quote: { type: "text" }, author: { type: "text" } },
      },
    });
  });

  it("survives a JSON round trip", () => {
    const d = f.object({ label: f.text({ required: true }), href: f.link() });
    expect(JSON.parse(JSON.stringify(d))).toEqual(d);
  });
});

describe("InferFields", () => {
  it("maps field types to prop types, honouring required", () => {
    const fields = {
      heading: f.text({ required: true }),
      body: f.richText(),
      count: f.number(),
      flag: f.boolean(),
      photo: f.image(),
      cta: f.object({ label: f.text(), href: f.link() }),
      quotes: f.array(f.object({ quote: f.text() })),
    };
    type Props = InferFields<typeof fields>;

    expectTypeOf<Props["heading"]>().toEqualTypeOf<string>();
    expectTypeOf<Props["body"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Props["count"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Props["flag"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Props["photo"]>().toEqualTypeOf<ImageValue | undefined>();
    expectTypeOf<Props["quotes"]>().toEqualTypeOf<
      { quote?: string }[] | undefined
    >();
  });
});
