// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Cta from "./Cta.js";
import { SectionsProvider } from "./provider.js";

it("link action renders an anchor to href", () => {
  render(<Cta label="Go" action="link" href="/x" />);
  expect(screen.getByRole("link", { name: /go/i }).getAttribute("href")).toBe(
    "/x",
  );
});

it("contact action calls onContact from the provider", () => {
  const onContact = vi.fn();
  render(
    <SectionsProvider onContact={onContact}>
      <Cta label="Contact" action="contact" />
    </SectionsProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /contact/i }));
  expect(onContact).toHaveBeenCalled();
});

it("contact action without a provider does not crash", () => {
  render(<Cta label="Contact" action="contact" />);
  fireEvent.click(screen.getByRole("button", { name: /contact/i })); // no throw
});
