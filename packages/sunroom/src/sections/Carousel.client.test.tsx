// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Carousel from "./Carousel.js";

vi.mock("next/image", () => ({ default: () => null }));

afterEach(() => vi.restoreAllMocks());

it("prev/next buttons scroll the track", () => {
  const scrollBy = vi
    .spyOn(HTMLElement.prototype, "scrollBy")
    .mockImplementation(() => {});
  render(<Carousel title="Faces" items={[{ name: "A" }, { name: "B" }]} />);
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
  fireEvent.click(screen.getByRole("button", { name: /previous/i }));
  expect(scrollBy).toHaveBeenCalledTimes(2);
});

it("arrow keys scroll the track", () => {
  const scrollBy = vi
    .spyOn(HTMLElement.prototype, "scrollBy")
    .mockImplementation(() => {});
  render(<Carousel items={[{ name: "A" }]} />);
  const track = screen.getByRole("list");
  fireEvent.keyDown(track, { key: "ArrowRight" });
  fireEvent.keyDown(track, { key: "ArrowLeft" });
  fireEvent.keyDown(track, { key: "Enter" }); // ignored
  expect(scrollBy).toHaveBeenCalledTimes(2);
});
