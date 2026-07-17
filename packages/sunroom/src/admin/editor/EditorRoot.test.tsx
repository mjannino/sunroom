import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { f } from "../../core/fields.js";
import { defineSection, resolveConfig } from "../../core/registry.js";
import { GitStore } from "../../store/git-store.js";
import { resetStores } from "../../store/singleton.js";
import { EditorRoot } from "./EditorRoot.js";

function Hero({ heading }: { heading: string }) {
  return <h1>{heading}</h1>;
}
const config = resolveConfig({
  sections: {
    hero: defineSection({
      label: "Hero",
      component: Hero,
      fields: { heading: f.text({ required: true }) },
    }),
  },
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "sunroom-editorroot-"));
  process.env.SUNROOM_CONTENT_DIR = dir;
  config.contentDir = dir;
  resetStores();
  const store = new GitStore(dir);
  await store.init();
  resetStores();
});
afterEach(async () => {
  resetStores();
  delete process.env.SUNROOM_CONTENT_DIR;
  await rm(dir, { recursive: true, force: true });
});

describe("EditorRoot dispatch", () => {
  it("renders the pages screen for no segments", async () => {
    const el = await EditorRoot({ config, params: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('data-screen="pages"');
  });
  it("renders the editor for a page slug", async () => {
    const el = await EditorRoot({
      config,
      params: Promise.resolve({ segments: ["pages", ""] }),
    });
    const html = renderToStaticMarkup(el);
    expect(html).toContain('data-screen="editor"');
  });
});
