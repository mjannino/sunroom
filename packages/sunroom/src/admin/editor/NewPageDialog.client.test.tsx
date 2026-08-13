// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NewPageDialog } from "./NewPageDialog.js";

it("clears its fields when closed and reopened", () => {
  const props = {
    onClose: vi.fn(),
    onCreate: vi.fn(async () => ({ ok: true }) as const),
  };
  const { rerender } = render(<NewPageDialog open {...props} />);
  fireEvent.change(screen.getByLabelText(/^title$/i), {
    target: { value: "Draft" },
  });
  expect((screen.getByLabelText(/^title$/i) as HTMLInputElement).value).toBe(
    "Draft",
  );
  rerender(<NewPageDialog open={false} {...props} />);
  rerender(<NewPageDialog open {...props} />);
  expect((screen.getByLabelText(/^title$/i) as HTMLInputElement).value).toBe(
    "",
  );
});
