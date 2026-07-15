import { describe, expect, it } from "vitest";
import { f } from "./fields.js";
import { defineSection, resolveConfig } from "./registry.js";

function Hero({ heading, body }: { heading: string; body?: string }) {
  return (
    <section>
      <h1>{heading}</h1>
      {body ? <p>{body}</p> : null}
    </section>
  );
}

describe("defineSection", () => {
  it("returns the definition unchanged", () => {
    const def = defineSection({
      label: "Hero",
      component: Hero,
      fields: { heading: f.text({ required: true }), body: f.richText() },
    });
    expect(def.label).toBe("Hero");
    expect(def.fields.heading).toEqual({ type: "text", required: true });
    expect(def.component).toBe(Hero);
    expect(def.deprecated).toBeUndefined();
  });
});

defineSection({
  label: "Broken",
  // @ts-expect-error Hero requires `heading: string` but no such field is declared
  component: Hero,
  fields: { body: f.richText() },
});

describe("resolveConfig", () => {
  it("defaults contentDir when not supplied", () => {
    const config = resolveConfig({ sections: {} });
    expect(config.contentDir).toBe("./.sunroom-content");
  });

  it("honours an explicit contentDir", () => {
    const config = resolveConfig({ contentDir: "/data/content", sections: {} });
    expect(config.contentDir).toBe("/data/content");
  });

  it("reads SUNROOM_CONTENT_DIR from the environment", () => {
    const prev = process.env.SUNROOM_CONTENT_DIR;
    process.env.SUNROOM_CONTENT_DIR = "/env/content";
    try {
      expect(resolveConfig({ sections: {} }).contentDir).toBe("/env/content");
    } finally {
      if (prev === undefined) delete process.env.SUNROOM_CONTENT_DIR;
      else process.env.SUNROOM_CONTENT_DIR = prev;
    }
  });
});
