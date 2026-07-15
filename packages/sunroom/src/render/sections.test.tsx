import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { f } from "../core/fields.js";
import { defineSection, resolveConfig } from "../core/registry.js";
import type { SectionInstance } from "../store/types.js";
import { Sections } from "./sections.js";

function Hero({ heading }: { heading: string }) {
  return <h1>{heading}</h1>;
}

function Quote({ text }: { text?: string }) {
  return <blockquote>{text}</blockquote>;
}

const config = resolveConfig({
  contentDir: "/unused",
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: { heading: f.text({ required: true }) },
    }),
    quote: defineSection({
      label: "Quote",
      component: Quote,
      fields: { text: f.text() },
    }),
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Sections", () => {
  it("renders each section with its props, in order", () => {
    const sections: SectionInstance[] = [
      { id: "a", type: "hero", props: { heading: "Welcome" } },
      { id: "b", type: "quote", props: { text: "Lovely" } },
    ];
    const html = renderToStaticMarkup(
      <Sections config={config} sections={sections} />,
    );
    expect(html).toBe("<h1>Welcome</h1><blockquote>Lovely</blockquote>");
  });

  it("renders nothing for an empty section list", () => {
    expect(
      renderToStaticMarkup(<Sections config={config} sections={[]} />),
    ).toBe("");
  });

  it("skips an unregistered section type instead of crashing the page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sections: SectionInstance[] = [
      { id: "a", type: "hero", props: { heading: "Welcome" } },
      { id: "b", type: "deleted-component", props: {} },
    ];

    const html = renderToStaticMarkup(
      <Sections config={config} sections={sections} />,
    );

    expect(html).toBe("<h1>Welcome</h1>");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("deleted-component");
    expect(warn.mock.calls[0]?.[0]).toContain("sunroom check");
  });
});
