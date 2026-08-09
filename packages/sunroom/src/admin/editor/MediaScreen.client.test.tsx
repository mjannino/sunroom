// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
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

function open(item = "old") {
  fireEvent.click(
    screen.getByRole("button", { name: new RegExp(`open ${item}`, "i") }),
  );
  return screen.getByRole("dialog");
}

it("renders a grid tile per image with its alt caption", () => {
  render(
    <MediaScreen
      media={items}
      pages={[]}
      settings={settings}
      actions={actions()}
    />,
  );
  expect(screen.getByRole("button", { name: /open old/i })).toBeTruthy();
  expect(screen.getByText("old")).toBeTruthy(); // tile caption
});

it("shows a Missing alt hint on a tile with empty alt", () => {
  const noAlt: MediaItem[] = [{ ...items[0]!, alt: "" }];
  render(
    <MediaScreen
      media={noAlt}
      pages={[]}
      settings={settings}
      actions={actions()}
    />,
  );
  expect(screen.getByText(/missing alt/i)).toBeTruthy();
});

it("opens a lightbox with the full-res image and filename when a tile is clicked", () => {
  render(
    <MediaScreen
      media={items}
      pages={[]}
      settings={settings}
      actions={actions()}
    />,
  );
  const dialog = open();
  const img = within(dialog).getByAltText("old") as HTMLImageElement;
  expect(img.src).toContain("https://cdn/m1.png");
  expect(within(dialog).getByText("m1.png")).toBeTruthy();
});

it("edits alt text in the lightbox (calls updateMedia on changed blur)", async () => {
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  const dialog = open();
  const alt = within(dialog).getByDisplayValue("old");
  fireEvent.change(alt, { target: { value: "new alt" } });
  fireEvent.blur(alt);
  await waitFor(() =>
    expect(acts.updateMedia).toHaveBeenCalledWith("m1", { alt: "new alt" }),
  );
});

it("does not call updateMedia when alt is unchanged on blur", async () => {
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  const dialog = open();
  fireEvent.blur(within(dialog).getByDisplayValue("old"));
  await new Promise((r) => setTimeout(r, 0));
  expect(acts.updateMedia).not.toHaveBeenCalled();
});

it("shows distinct-page usage in the lightbox (used twice on one page = 1 page)", () => {
  render(
    <MediaScreen
      media={items}
      pages={[pageUsingTwice]}
      settings={settings}
      actions={actions()}
    />,
  );
  const dialog = open();
  expect(within(dialog).getByText(/used on 1 page/i)).toBeTruthy();
});

it("deletes an unused image from the lightbox after confirm, then closes", async () => {
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  const acts = actions();
  render(
    <MediaScreen media={items} pages={[]} settings={settings} actions={acts} />,
  );
  const dialog = open();
  fireEvent.click(within(dialog).getByRole("button", { name: /delete old/i }));
  await waitFor(() => expect(acts.deleteMedia).toHaveBeenCalledWith("m1"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull()); // closed
});

it("confirms with usage before deleting an in-use image; cancel blocks delete", () => {
  const confirmSpy = vi.fn(() => false);
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
  const dialog = open();
  fireEvent.click(within(dialog).getByRole("button", { name: /delete old/i }));
  expect(confirmSpy).toHaveBeenCalledWith(
    expect.stringMatching(/about \(section: hero\)/i),
  );
  expect(acts.deleteMedia).not.toHaveBeenCalled();
});

it("closes the lightbox on backdrop click and on Escape", () => {
  render(
    <MediaScreen
      media={items}
      pages={[]}
      settings={settings}
      actions={actions()}
    />,
  );
  // backdrop click
  const dialog = open();
  fireEvent.click(dialog.parentElement as HTMLElement); // the .sr-modal-backdrop
  expect(screen.queryByRole("dialog")).toBeNull();
  // Escape — keydown bubbles from body up to the window listener; fireEvent
  // wraps the resulting state update in act() so it flushes before the assert.
  open();
  fireEvent.keyDown(document.body, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});
