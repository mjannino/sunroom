import { describe, expect, it } from "vitest";
import { toEmbedSrc } from "./embed-src.js";

describe("toEmbedSrc", () => {
  it("spotify playlist share URL -> embed src", () => {
    expect(
      toEmbedSrc(
        "spotify",
        "https://open.spotify.com/playlist/37i9dQZF1DX?si=abc",
      ),
    ).toBe("https://open.spotify.com/embed/playlist/37i9dQZF1DX");
  });

  it("spotify album share URL -> embed src", () => {
    expect(
      toEmbedSrc("spotify", "https://open.spotify.com/album/1DFixLWuPkv"),
    ).toBe("https://open.spotify.com/embed/album/1DFixLWuPkv");
  });

  it("youtube playlist URL -> embed videoseries src", () => {
    expect(
      toEmbedSrc("youtube", "https://www.youtube.com/playlist?list=PLabc123"),
    ).toBe("https://www.youtube.com/embed/videoseries?list=PLabc123");
  });

  it("youtube watch URL with list -> embed videoseries src", () => {
    expect(
      toEmbedSrc(
        "youtube",
        "https://www.youtube.com/watch?v=xyz&list=PLabc123",
      ),
    ).toBe("https://www.youtube.com/embed/videoseries?list=PLabc123");
  });

  it("soundcloud URL -> widget player src (url-encoded, no color param)", () => {
    const src = toEmbedSrc(
      "soundcloud",
      "https://soundcloud.com/artist/sets/mix",
    );
    expect(src?.startsWith("https://w.soundcloud.com/player/?url=")).toBe(true);
    expect(
      src?.includes(
        encodeURIComponent("https://soundcloud.com/artist/sets/mix"),
      ),
    ).toBe(true);
    expect(src?.includes("color=")).toBe(false);
  });

  it("unparseable / mismatched URL -> null", () => {
    expect(toEmbedSrc("spotify", "https://example.com/nope")).toBe(null);
    expect(toEmbedSrc("spotify", "not a url")).toBe(null);
  });

  it("spoofed domains -> null", () => {
    expect(toEmbedSrc("spotify", "https://evilspotify.com/playlist/abc")).toBe(
      null,
    );
    expect(
      toEmbedSrc("soundcloud", "https://notsoundcloud.com/artist/sets/mix"),
    ).toBe(null);
  });
});
