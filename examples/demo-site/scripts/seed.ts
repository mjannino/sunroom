import { GitStore } from "sunroom";

const AUTHOR = { name: "Seed", email: "seed@example.com" };
const CONTENT_DIR = process.env.SUNROOM_CONTENT_DIR ?? "./.sunroom-content";

const store = new GitStore(CONTENT_DIR);
await store.init();

// --- media (storageKey resolves to /media/<key> via R2_PUBLIC_BASE=/media) ---
const img = (
  id: string,
  key: string,
  width: number,
  height: number,
  alt: string,
) => ({ id, storageKey: key, filename: key.split("/").pop()!, mime: "image/webp", width, height, size: 1, alt, createdAt: "2026-01-01T00:00:00Z" });

const media = [
  img("hero-home", "seed/hero-home.webp", 1600, 900, "The Longshot Room control room"),
  img("hero-credits", "seed/hero-credits.webp", 1600, 900, "Mixing console detail"),
  img("hero-gear", "seed/hero-gear.webp", 1600, 900, "Outboard gear rack"),
  img("hero-about", "seed/hero-about.webp", 1600, 900, "Mara Voss at the board"),
  ...Array.from({ length: 12 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return img(`cover-${n}`, `seed/cover-${n}.webp`, 1000, 1000, `Record cover ${n}`);
  }),
  ...Array.from({ length: 6 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return img(`gear-${n}`, `seed/gear-${n}.webp`, 1200, 900, `Gear highlight ${n}`);
  }),
];
for (const m of media) await store.addMedia(m, { author: AUTHOR });

// --- invented content (placeholder-quality but coherent) ---
const BANDS = [
  ["Slow Weather", "Tin Roof Hymns"],
  ["Paper Anchors", "Everything Louder"],
  ["The Gray Coast", "Undertow"],
  ["Cheap Halos", "Basement Light"],
  ["Northbound", "Winter Count"],
  ["Ivy & Ammo", "Static Bloom"],
];

const home = store.getPage("");
if (!home) throw new Error("Expected init() to create a home page");

await store.savePage(
  {
    slug: "",
    title: "Home",
    position: 0,
    seo: { description: "Mara Voss — producer, mixer, engineer. The Longshot Room, Philadelphia." },
    sections: [
      { id: "home-hero", type: "hero", props: { image: "hero-home" } },
      {
        id: "home-credits",
        type: "creditsGrid",
        props: {
          title: "Selected work",
          records: BANDS.map(([band, release], i) => ({
            cover: `cover-${String(i + 1).padStart(2, "0")}`,
            band,
            release,
          })),
        },
      },
      { id: "home-cta", type: "cta", props: { label: "Contact", action: "contact" } },
    ],
  },
  { baseVersion: home.version, author: AUTHOR },
);

await store.savePage(
  {
    slug: "credits",
    title: "Credits",
    position: 1,
    seo: { title: "Credits | Mara Voss" },
    sections: [
      { id: "credits-hero", type: "hero", props: { kicker: "CREDITS", image: "hero-credits" } },
      {
        id: "credits-embed",
        type: "embed",
        props: {
          title: "A few things from the room",
          provider: "spotify",
          url: "https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j",
        },
      },
      {
        id: "credits-list",
        type: "discography",
        props: {
          title: "Full discography",
          entries: [
            { label: "Slow Weather — Tin Roof Hymns", url: "https://example.com" },
            { label: "Paper Anchors — Everything Louder" },
            { label: "The Gray Coast — Undertow", url: "https://example.com" },
            { label: "Cheap Halos — Basement Light" },
            { label: "Northbound — Winter Count", url: "https://example.com" },
            { label: "Ivy & Ammo — Static Bloom" },
            { label: "Dead Letter Choir — Rites" },
            { label: "Coastward — Held Under", url: "https://example.com" },
          ],
        },
      },
      { id: "credits-cta", type: "cta", props: { label: "Work with me", action: "contact" } },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

await store.savePage(
  {
    slug: "gear",
    title: "Gear",
    position: 2,
    seo: { title: "Gear | Mara Voss" },
    sections: [
      { id: "gear-hero", type: "hero", props: { kicker: "GEAR", image: "hero-gear" } },
      {
        id: "gear-carousel",
        type: "carousel",
        props: {
          title: "Highlights",
          items: Array.from({ length: 6 }, (_, i) => {
            const n = String(i + 1).padStart(2, "0");
            const names = ["API 1608", "Studer A80", "Neve 1073 ×2", "LA-2A", "Ludwig kit", "Distressor ×4"];
            return { image: `gear-${n}`, name: names[i], note: "In regular rotation." };
          }),
        },
      },
      {
        id: "gear-list",
        type: "prose",
        props: {
          kicker: "COMPLETE LIST",
          body:
            "<p>The room is built around an API 1608 and a Studer A80 for tape. " +
            "Front end is mostly Neve and API; compression from an LA-2A, a pair of 1176s, " +
            "and a rack of Distressors. Monitoring on ATC and NS-10s.</p>" +
            "<p>Mic locker spans Coles, Royer, a few vintage Neumanns, and the usual " +
            "SM7/57 workhorses. Full list available on request.</p>",
        },
      },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

await store.savePage(
  {
    slug: "about",
    title: "About",
    position: 3,
    seo: { title: "About | Mara Voss" },
    sections: [
      { id: "about-hero", type: "hero", props: { kicker: "ABOUT", image: "hero-about" } },
      {
        id: "about-prose",
        type: "prose",
        props: {
          body:
            "<p>Mara Voss is a producer, mixer, and engineer based just outside " +
            "Philadelphia. She started recording bands in a basement at 15 and never " +
            "really stopped — two decades later it's still punk, hardcore, emo, and rock, " +
            "almost exclusively.</p>" +
            "<p>The Longshot Room is her studio: a warm, analog-leaning space built for " +
            "bands who want to sound like themselves on their best night.</p>",
          sidebar: {
            contactBlurb: "Send a few details and I'll be in touch.",
            ctaLabel: "Contact",
            bookingHeading: "BOOKING & RATES",
            bookingBody: '<p>Handled directly — <a href="#contact">get in touch</a>.</p>',
          },
        },
      },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

console.log("Seeded 4 pages + media into", CONTENT_DIR);
