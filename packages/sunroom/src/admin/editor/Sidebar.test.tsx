import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PageSummary } from "../../store/types.js";
import { Sidebar } from "./Sidebar.js";

const pages: PageSummary[] = [
  { slug: "", title: "Home", position: 0 },
  { slug: "about", title: "About", position: 1 },
];

describe("Sidebar", () => {
  it("marks the Pages nav item active, and Media/Settings disabled with a Soon marker", () => {
    const html = renderToStaticMarkup(
      <Sidebar pages={pages} activeSlug={null} activeScreen="pages" />,
    );
    expect(html).toMatch(
      /<a class="sr-nav-item is-active" href="\/admin">/,
    );
    expect(html).toContain('class="sr-nav-item is-disabled"');
    const soonCount = html.match(/class="sr-soon"/g)?.length ?? 0;
    expect(soonCount).toBe(2);
    expect(html).toContain(">Soon<");
    expect(html).toContain(">Media<");
    expect(html).toContain(">Settings<");
  });

  it("renders a link per page to /admin/pages/<slug>, marking the active slug's row is-active", () => {
    const html = renderToStaticMarkup(
      <Sidebar pages={pages} activeSlug="about" activeScreen="editor" />,
    );
    expect(html).toContain('href="/admin/pages/"');
    expect(html).toContain('href="/admin/pages/about"');
    expect(html).toMatch(/class="sr-page is-active" href="\/admin\/pages\/about"/);
    // The home row (not active here) must not carry is-active.
    expect(html).toMatch(/class="sr-page" href="\/admin\/pages\/"/);
  });

  it("shows a home-sun marker and title label for the home page (slug \"\")", () => {
    const html = renderToStaticMarkup(
      <Sidebar pages={pages} activeSlug={null} activeScreen="pages" />,
    );
    expect(html).toContain('class="sr-home-dot"');
    expect(html).toContain(">Home<");
  });

  it("renders a New page link pointing at /admin", () => {
    const html = renderToStaticMarkup(
      <Sidebar pages={pages} activeSlug={null} activeScreen="pages" />,
    );
    expect(html).toMatch(/<a class="sr-newpage" href="\/admin">\+ New page<\/a>/);
  });
});
