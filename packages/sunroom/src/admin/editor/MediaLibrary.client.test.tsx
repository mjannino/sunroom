// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaProvider } from "./MediaContext.js";
import { MediaLibrary } from "./MediaLibrary.js";
import type { MediaActions, MediaItem, MediaResult } from "./types.js";

const ITEMS: MediaItem[] = [
  {
    id: "a",
    url: "https://cdn/a.jpg",
    width: 1,
    height: 1,
    alt: "Photo A",
    filename: "a.jpg",
  },
];

function mediaActions(over: Partial<MediaActions> = {}): MediaActions {
  return {
    // `as const` keeps `ok` a literal `true` (not widened to `boolean`) so
    // these structurally satisfy `MediaResult<T>`, which requires `ok: true`.
    requestUpload: vi.fn(
      async () =>
        ({
          ok: true,
          uploadUrl: "https://put",
          storageKey: "uploads/x.jpg",
        }) as const,
    ),
    commitMedia: vi.fn(
      async () =>
        ({ ok: true, id: "new", url: "https://cdn/new.png" }) as const,
    ),
    // `{ ok: true }` alone doesn't structurally satisfy `{ ok: true } &
    // Record<string, never>` (the `ok` property gets checked against the
    // index signature too); the cast is safe since there is no payload here
    // (see actions.ts's deleteMediaAction for the same pattern).
    deleteMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    ...over,
  };
}

function renderLibrary(actions = mediaActions(), onPick = vi.fn()) {
  render(
    <MediaProvider items={ITEMS} actions={actions}>
      <MediaLibrary onPick={onPick} onClose={vi.fn()} />
    </MediaProvider>,
  );
  return { actions, onPick };
}

describe("MediaLibrary", () => {
  it("lists media and picks one by clicking it", () => {
    const { onPick } = renderLibrary();
    fireEvent.click(screen.getByAltText("Photo A"));
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("runs the upload flow: requestUpload → PUT → commitMedia, then appends", async () => {
    // mock the browser PUT and dimension extraction
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    // stub Image so onload fires with dimensions
    class FakeImage {
      onload: (() => void) | null = null;
      naturalWidth = 640;
      naturalHeight = 480;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => {},
    } as unknown as typeof URL);

    const { actions } = renderLibrary();
    const file = new File([new Uint8Array([1, 2, 3])], "up.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(actions.requestUpload).toHaveBeenCalledWith("up.png", "image/png");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://put",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(actions.commitMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: "uploads/x.jpg",
          mime: "image/png",
          width: 640,
          height: 480,
          size: 3,
        }),
      );
    });
    vi.unstubAllGlobals();
  });

  it("does NOT commit media when the browser PUT fails", async () => {
    // mock a failed PUT and dimension extraction
    const fetchMock = vi.fn(async () => ({ ok: false }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    class FakeImage {
      onload: (() => void) | null = null;
      naturalWidth = 640;
      naturalHeight = 480;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage as unknown as typeof Image);
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => {},
    } as unknown as typeof URL);

    const { actions } = renderLibrary();
    const file = new File([new Uint8Array([1, 2, 3])], "up.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://put",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(screen.getByRole("alert").textContent).toMatch(/upload failed/i);
    });
    expect(actions.commitMedia).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("deletes an item via the action", async () => {
    const { actions } = renderLibrary();
    fireEvent.click(screen.getByRole("button", { name: /delete Photo A/i }));
    await waitFor(() => expect(actions.deleteMedia).toHaveBeenCalledWith("a"));
  });
});
