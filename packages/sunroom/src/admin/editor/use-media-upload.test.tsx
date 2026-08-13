// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useMediaUpload } from "./use-media-upload.js";
import { MediaProvider } from "./MediaContext.js";
import type { MediaActions, MediaResult } from "./types.js";

function actions(over: Partial<MediaActions> = {}): MediaActions {
  return {
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
    deleteMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    updateMedia: vi.fn(
      async () => ({ ok: true }) as MediaResult<Record<string, never>>,
    ),
    ...over,
  };
}

// A harness that renders the hook's state and triggers an upload.
function Harness({ file }: { file: File }) {
  const { uploads, uploadFiles } = useMediaUpload();
  return (
    <div>
      <button onClick={() => uploadFiles([file])}>go</button>
      {uploads.map((u) => (
        <span key={u.id}>
          {u.name}:{u.status}
        </span>
      ))}
    </div>
  );
}

// A harness that lets each render pick a different file, so a test can
// simulate two separate upload batches through the same hook instance.
function MultiBatchHarness() {
  const { uploads, uploadFiles } = useMediaUpload();
  return (
    <div>
      <button onClick={() => uploadFiles([new File(["a"], "a.jpg")])}>
        go-a
      </button>
      <button onClick={() => uploadFiles([new File(["b"], "b.jpg")])}>
        go-b
      </button>
      {uploads.map((u) => (
        <span key={u.id}>
          {u.name}:{u.status}
        </span>
      ))}
    </div>
  );
}

it("runs presign→PUT→commit and marks the upload done", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true }) as Response),
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:x",
    revokeObjectURL: () => {},
  });
  // jsdom does not load images, so neither onload nor onerror fires for a blob
  // URL — stub Image so setting `src` resolves dimensions on a microtask.
  class FakeImage {
    naturalWidth = 4;
    naturalHeight = 3;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
  const acts = actions();
  render(
    <MediaProvider items={[]} actions={acts}>
      <Harness file={file} />
    </MediaProvider>,
  );
  screen.getByText("go").click();
  await waitFor(() => expect(screen.getByText(/p\.jpg:done/)).toBeTruthy());
  expect(acts.requestUpload).toHaveBeenCalled();
  expect(acts.commitMedia).toHaveBeenCalled();
});

it("a fresh upload batch clears prior rows/errors from an earlier failed batch", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true }) as Response),
  );
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:x",
    revokeObjectURL: () => {},
  });
  class FakeImage {
    naturalWidth = 4;
    naturalHeight = 3;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal("Image", FakeImage);
  // requestUpload fails validation for a.jpg (first batch) but succeeds for
  // b.jpg (second batch), so we can prove the second batch clears the first
  // batch's error row rather than leaving it stuck in the list.
  const acts = actions({
    requestUpload: vi.fn(async (filename: string) =>
      filename === "a.jpg"
        ? ({
            ok: false,
            reason: "validation",
            message: "bad file",
          } as const)
        : ({
            ok: true,
            uploadUrl: "https://put",
            storageKey: "uploads/x.jpg",
          } as const),
    ),
  });
  render(
    <MediaProvider items={[]} actions={acts}>
      <MultiBatchHarness />
    </MediaProvider>,
  );

  screen.getByText("go-a").click();
  await waitFor(() => expect(screen.getByText(/a\.jpg:error/)).toBeTruthy());

  screen.getByText("go-b").click();
  await waitFor(() => expect(screen.getByText(/b\.jpg:done/)).toBeTruthy());

  // the new batch replaced the uploads list — a.jpg's error row is gone.
  expect(screen.queryByText(/a\.jpg/)).toBeNull();
});
