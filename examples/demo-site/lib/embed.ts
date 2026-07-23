export type EmbedProvider = "spotify" | "youtube" | "soundcloud";

function isHostOrSubdomain(hostname: string, root: string): boolean {
  return hostname === root || hostname.endsWith("." + root);
}

/**
 * Turn a normal share URL into the provider's embeddable iframe src.
 * Returns null when the URL doesn't match the provider (caller renders nothing).
 */
export function toEmbedSrc(provider: EmbedProvider, url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  if (provider === "spotify") {
    // /playlist/ID, /album/ID, /track/ID  ->  /embed/<kind>/ID
    const m = u.pathname.match(/^\/(playlist|album|track)\/([A-Za-z0-9]+)/);
    if (!isHostOrSubdomain(u.hostname, "spotify.com") || !m) return null;
    return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
  }

  if (provider === "youtube") {
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
    const list = u.searchParams.get("list");
    if (!list) return null;
    return `https://www.youtube.com/embed/videoseries?list=${list}`;
  }

  if (provider === "soundcloud") {
    if (!isHostOrSubdomain(u.hostname, "soundcloud.com")) return null;
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff6f52`;
  }

  return null;
}
