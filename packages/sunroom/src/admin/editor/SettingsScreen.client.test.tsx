// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen.js";
import type { Settings } from "../../store/types.js";

const base: Settings = { seoDefaults: {}, redirects: [] };

it("saves edited site name and madeWith", async () => {
  const onSave = vi.fn(async () => ({ ok: true }) as const);
  render(<SettingsScreen settings={base} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText(/site name/i), {
    target: { value: "Mara Voss" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        site: expect.objectContaining({ name: "Mara Voss" }),
      }),
    ),
  );
});
