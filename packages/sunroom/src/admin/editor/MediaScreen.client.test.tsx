// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaScreen } from "./MediaScreen.js";
import type { MediaActions, MediaItem, MediaResult } from "./types.js";
import type { Page, Settings } from "../../store/types.js";

function actions(over: Partial<MediaActions> = {}): MediaActions {
  return {
    requestUpload: vi.fn(
      async () => ({ ok: true, uploadUrl: "u", storageKey: "k" }) as const,
    ),
    commitMedia: vi.fn(
      async () => ({ ok: true, id: "n", url: "https://cdn/n.png" }) as const,
    ),
    deleteMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    updateMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    ...over,
  };
}
const items: MediaItem[] = [
  {
    id: "m1",
    url: "https://cdn/m1.png",
    width: 10,
    height: 10,
    alt: "old",
    filename: "m1.png",
  },
];
const settings: Settings = { seoDefaults: {}, redirects: [] };
const pageUsing: Page = {
  slug: "about",
  title: "About",
  position: 1,
  seo: {},
  sections: [{ id: "s1", type: "hero", props: { image: "m1" } }],
};
const pageUsingTwice: Page = {
  slug: "about",
  title: "About",
  position: 1,
  seo: {},
  sections: [
    { id: "s1", type: "hero", props: { image: "m1" } },
    { id: "s2", type: "gallery", props: { images: ["m1"] } },
  ],
};

it("edits alt text (calls updateMedia on blur)", async () => {
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  const alt = screen.getByDisplayValue("old");
  fireEvent.change(alt, { target: { value: "new alt" } });
  fireEvent.blur(alt);
  await waitFor(() =>
    expect(acts.updateMedia).toHaveBeenCalledWith("m1", { alt: "new alt" }),
  );
});

it("does not call updateMedia when alt text is unchanged on blur", async () => {
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  const alt = screen.getByDisplayValue("old");
  fireEvent.blur(alt);
  await new Promise((r) => setTimeout(r, 0));
  expect(acts.updateMedia).not.toHaveBeenCalled();
});

it("counts an image used twice on the same page as 1 page", async () => {
  const acts = actions();
  render(
    <MediaScreen
      media={items}
      pages={[pageUsingTwice]}
      settings={settings}
      actions={acts}
    />,
  );
  expect(screen.getByText(/used on 1 page/i)).toBeTruthy();
});

it("deletes an unused image after confirm", async () => {
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /delete m1|delete old/i }),
  );
  await waitFor(() => expect(acts.deleteMedia).toHaveBeenCalledWith("m1"));
});

it("shows usage and confirms before deleting an in-use image", async () => {
  const confirmSpy = vi.fn(() => false); // cancel
  vi.stubGlobal("confirm", confirmSpy);
  const acts = actions();
  render(
    <MediaScreen
      media={items}
      pages={[pageUsing]}
      settings={settings}
      actions={acts}
    />,
  );
  expect(screen.getByText(/used on 1 page/i)).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: /delete m1|delete old/i }),
  );
  expect(confirmSpy).toHaveBeenCalled();
  expect(acts.deleteMedia).not.toHaveBeenCalled(); // cancelled
});
