// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ContactButton } from "./ContactButton.js";
import { SectionsProvider } from "./provider.js";

it("clicking calls onContact from the provider", () => {
  const onContact = vi.fn();
  render(
    <SectionsProvider onContact={onContact}>
      <ContactButton label="Book" />
    </SectionsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /book/i }));
  expect(onContact).toHaveBeenCalled();
});

it("without a provider it does not crash on click", () => {
  render(<ContactButton label="Book" />);
  fireEvent.click(screen.getByRole("button", { name: /book/i })); // no throw
});
