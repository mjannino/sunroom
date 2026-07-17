import { GitStore } from "sunroom";

const AUTHOR = { name: "Seed", email: "seed@example.com" };
const CONTENT_DIR = process.env.SUNROOM_CONTENT_DIR ?? "./.sunroom-content";

const store = new GitStore(CONTENT_DIR);
await store.init();

const home = store.getPage("");
if (!home) throw new Error("Expected init() to create a home page");

await store.addMedia(
  {
    id: "hero-1",
    storageKey: "seed/hero.jpg",
    filename: "hero.jpg",
    mime: "image/jpeg",
    width: 1200,
    height: 800,
    size: 1,
    alt: "Sunlit garden",
    createdAt: "2026-01-01T00:00:00Z",
  },
  { author: AUTHOR },
);

await store.savePage(
  {
    slug: "",
    title: "Home",
    position: 0,
    seo: { description: "A bespoke site, editable by its owner." },
    sections: [
      {
        id: "home-hero",
        type: "hero",
        props: {
          heading: "Sunlight Landscaping",
          body: "<p>Gardens that look after themselves. Mostly.</p>",
          image: "hero-1",
        },
      },
      {
        id: "home-testimonials",
        type: "testimonials",
        props: {
          title: "What our clients say",
          quotes: [
            {
              quote: "They turned a car park into a meadow.",
              author: "Priya N.",
            },
            { quote: "Punctual, tidy, and the roses lived.", author: "Tom B." },
          ],
        },
      },
    ],
  },
  { baseVersion: home.version, author: AUTHOR },
);

await store.savePage(
  {
    slug: "about",
    title: "About",
    position: 1,
    seo: { title: "About | Sunlight Landscaping" },
    sections: [
      {
        id: "about-hero",
        type: "hero",
        props: {
          heading: "Twelve years of digging",
          body: "<p>We are a small team based in Leeds.</p>",
        },
      },
    ],
  },
  { baseVersion: null, author: AUTHOR },
);

console.log("Seeded 2 pages into", CONTENT_DIR);
