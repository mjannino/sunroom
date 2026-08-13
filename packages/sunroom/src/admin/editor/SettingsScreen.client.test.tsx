// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen.js";
import type { Settings } from "../../store/types.js";
import type { MediaActions, MediaResult } from "./types.js";

const base: Settings = { seoDefaults: {}, redirects: [] };

function mediaActions(): MediaActions {
  return {
    requestUpload: vi.fn(
      async () => ({ ok: true, uploadUrl: "u", storageKey: "k" }) as const,
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
  };
}

it("saves the site name and defaults the header to text", async () => {
  const onSave = vi.fn(async () => ({ ok: true }) as const);
  render(
    <SettingsScreen
      settings={base}
      onSave={onSave}
      media={[]}
      mediaActions={mediaActions()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/site name/i), {
    target: { value: "Mara Voss" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        site: expect.objectContaining({
          name: "Mara Voss",
          header: { type: "text" },
        }),
      }),
    ),
  );
});

it("reveals an image picker when the header type is Image", () => {
  render(
    <SettingsScreen
      settings={base}
      onSave={vi.fn(async () => ({ ok: true }) as const)}
      media={[]}
      mediaActions={mediaActions()}
    />,
  );
  expect(screen.queryByRole("button", { name: /choose image/i })).toBeNull();
  fireEvent.change(screen.getByLabelText(/type/i), {
    target: { value: "image" },
  });
  expect(screen.getByRole("button", { name: /choose image/i })).toBeTruthy();
});
