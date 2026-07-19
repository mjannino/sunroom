import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml, sanitizeProps } from "./sanitize.js";
import { f } from "./fields.js";

describe("sanitizeRichTextHtml", () => {
  it("keeps StarterKit formatting", () => {
    const html = "<p><strong>Hi</strong> <em>there</em></p><ul><li>a</li></ul>";
    expect(sanitizeRichTextHtml(html)).toBe(html);
  });

  it("strips scripts and event handlers", () => {
    expect(sanitizeRichTextHtml('<img src=x onerror="alert(1)">')).toBe("");
    expect(sanitizeRichTextHtml("<script>alert(1)</script>")).toBe("");
    expect(sanitizeRichTextHtml('<p onclick="x()">hi</p>')).toBe("<p>hi</p>");
  });

  it("drops javascript: and data: links but keeps http/mailto/relative", () => {
    expect(sanitizeRichTextHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      "<a>x</a>",
    );
    expect(sanitizeRichTextHtml('<a href="https://a.com">x</a>')).toContain(
      'href="https://a.com"',
    );
    expect(sanitizeRichTextHtml('<a href="mailto:a@b.com">x</a>')).toContain(
      "mailto:a@b.com",
    );
    expect(sanitizeRichTextHtml('<a href="/about">x</a>')).toContain(
      'href="/about"',
    );
  });

  it("forces rel on links", () => {
    expect(sanitizeRichTextHtml('<a href="https://a.com">x</a>')).toContain(
      'rel="nofollow noopener"',
    );
  });
});

describe("sanitizeProps", () => {
  it("sanitizes richText leaves, incl. nested object/array, leaving other fields untouched", () => {
    const fields = {
      title: f.text(),
      body: f.richText(),
      block: f.object({ note: f.richText() }),
      items: f.array(f.object({ html: f.richText(), name: f.text() })),
    };
    const out = sanitizeProps(fields, {
      title: "<b>x</b>", // text field: not HTML-sanitized, passthrough
      body: "<script>a</script><p>ok</p>",
      block: { note: '<a href="javascript:1">n</a>' },
      items: [{ html: "<img src=x onerror=alert(1)>", name: "<i>keep</i>" }],
    });
    expect(out.title).toBe("<b>x</b>");
    expect(out.body).toBe("<p>ok</p>");
    expect((out.block as any).note).toBe("<a>n</a>");
    expect((out.items as any)[0].html).toBe("");
    expect((out.items as any)[0].name).toBe("<i>keep</i>");
  });
});
