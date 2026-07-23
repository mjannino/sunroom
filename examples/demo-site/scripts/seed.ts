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
) => ({ id, storageKey: key, filename: key.split("/").pop()!, mime: "image/jpeg", width, height, size: 1, alt, createdAt: "2026-01-01T00:00:00Z" });

// Real assets live in public/media/seed/*.jpg (served offline via R2_PUBLIC_BASE=/media).
// Widths/heights are the files' real intrinsic sizes; components crop with object-fit:cover.
const media = [
  img("hero-home", "seed/hero-home.jpg", 1575, 1049, "The Longshot Room control room"),
  img("hero-credits", "seed/hero-credits.jpg", 1575, 1049, "Mixing console detail"),
  img("hero-gear", "seed/hero-gear.jpg", 1246, 827, "Outboard gear rack"),
  img("hero-about", "seed/hero-about.jpg", 1246, 831, "Mara Voss at the board"),
  img("cover-01", "seed/cover-01.jpg", 1000, 998, "Slow Weather — Tin Roof Hymns cover"),
  img("cover-02", "seed/cover-02.jpg", 700, 700, "Paper Anchors — Everything Louder cover"),
  img("cover-03", "seed/cover-03.jpg", 1200, 1200, "The Gray Coast — Undertow cover"),
  img("cover-04", "seed/cover-04.jpg", 700, 700, "Cheap Halos — Basement Light cover"),
  img("cover-05", "seed/cover-05.jpg", 700, 700, "Northbound — Winter Count cover"),
  img("cover-06", "seed/cover-06.jpg", 900, 900, "Ivy & Ammo — Static Bloom cover"),
  img("gear-01", "seed/gear-01.jpg", 2000, 2000, "API 1608 console"),
  img("gear-02", "seed/gear-02.jpg", 600, 600, "Studer A80 tape machine"),
  img("gear-03", "seed/gear-03.jpg", 640, 427, "Neve 1073 preamps"),
  img("gear-04", "seed/gear-04.jpg", 520, 387, "LA-2A compressor"),
  img("gear-05", "seed/gear-05.jpg", 683, 1024, "Ludwig drum kit"),
  img("gear-06", "seed/gear-06.jpg", 2000, 2982, "Distressor units"),
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
            bookingBody:
              '<p>Handled directly — <a href="mailto:booking@thelongshotroom.example">get in touch</a>.</p>',
          },
        },
      },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

console.log("Seeded 4 pages + media into", CONTENT_DIR);
