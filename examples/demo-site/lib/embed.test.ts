import { test } from "node:test";
import assert from "node:assert/strict";
import { toEmbedSrc } from "./embed.ts";

test("spotify playlist share URL -> embed src", () => {
  assert.equal(
    toEmbedSrc("spotify", "https://open.spotify.com/playlist/37i9dQZF1DX?si=abc"),
    "https://open.spotify.com/embed/playlist/37i9dQZF1DX",
  );
});

test("spotify album share URL -> embed src", () => {
  assert.equal(
    toEmbedSrc("spotify", "https://open.spotify.com/album/1DFixLWuPkv"),
    "https://open.spotify.com/embed/album/1DFixLWuPkv",
  );
});

test("youtube playlist URL -> embed videoseries src", () => {
  assert.equal(
    toEmbedSrc("youtube", "https://www.youtube.com/playlist?list=PLabc123"),
    "https://www.youtube.com/embed/videoseries?list=PLabc123",
  );
});

test("youtube watch URL with list -> embed videoseries src", () => {
  assert.equal(
    toEmbedSrc("youtube", "https://www.youtube.com/watch?v=xyz&list=PLabc123"),
    "https://www.youtube.com/embed/videoseries?list=PLabc123",
  );
});

test("soundcloud URL -> widget player src (url-encoded)", () => {
  const src = toEmbedSrc("soundcloud", "https://soundcloud.com/artist/sets/mix");
  assert.ok(src?.startsWith("https://w.soundcloud.com/player/?url="));
  assert.ok(src?.includes(encodeURIComponent("https://soundcloud.com/artist/sets/mix")));
});

test("unparseable / mismatched URL -> null", () => {
  assert.equal(toEmbedSrc("spotify", "https://example.com/nope"), null);
  assert.equal(toEmbedSrc("spotify", "not a url"), null);
});
