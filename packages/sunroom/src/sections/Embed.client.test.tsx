// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Embed from "./Embed.js";

it("renders an iframe with the derived src for a valid provider+url", () => {
  render(
    <Embed
      provider="spotify"
      url="https://open.spotify.com/album/1DFixLWuPkv"
      title="Album"
    />,
  );
  const frame = screen.getByTitle("Album");
  expect(frame.getAttribute("src")).toBe(
    "https://open.spotify.com/embed/album/1DFixLWuPkv",
  );
});

it("renders nothing when the URL does not match the provider", () => {
  const { container } = render(
    <Embed provider="spotify" url="https://example.com/nope" />,
  );
  expect(container.firstChild).toBeNull();
});

it("renders nothing when provider is unknown", () => {
  const { container } = render(
    <Embed
      provider="bandcamp"
      url="https://open.spotify.com/album/1DFixLWuPkv"
    />,
  );
  expect(container.firstChild).toBeNull();
});
