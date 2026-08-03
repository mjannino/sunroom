// Post-deploy smoke check for the demo site.
//
// Catches the two failures that shipped to staging undetected:
//   1. a page returning 200 but rendering only chrome (no sections) — what
//      happened to `/` when it was prerendered against empty build-time content
//   2. images referenced by a page that don't actually resolve — what happened
//      when the seeded media pointed at an R2 bucket nothing had been uploaded to
//
// Status codes alone are useless here: every one of those pages was a 200.
//
// Usage:
//   node scripts/smoke.mjs [baseUrl]          # default http://localhost:3000
//   node scripts/smoke.mjs https://sunroom-staging.fly.dev
//
// Exits non-zero on the first failing assertion set, printing what broke.

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/credits", "/gear", "/about"];

const failures = [];
const note = (msg) => console.log(`  ${msg}`);

function fail(msg) {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, type: res.headers.get("content-type") ?? "", res };
}

console.log(`smoke: ${base}`);

// --- pages: must be 200 AND actually render content, not just chrome ---
const imageUrls = new Set();

for (const path of PAGES) {
  const url = `${base}${path}`;
  let status, html;
  try {
    const r = await get(url);
    status = r.status;
    html = await r.res.text();
  } catch (err) {
    fail(`${path} — request failed: ${err.message}`);
    continue;
  }

  if (status !== 200) {
    fail(`${path} — HTTP ${status}`);
    continue;
  }

  // Sections render <img>/<section>; chrome alone renders neither. Requiring a
  // <section> is what distinguishes "page rendered" from "page served empty".
  const sections = (html.match(/<section/g) ?? []).length;
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);

  if (sections === 0) {
    fail(`${path} — 200 but rendered 0 sections (empty page / stale render?)`);
    continue;
  }
  if (imgs.length === 0) {
    fail(`${path} — 200, ${sections} section(s), but no <img> found`);
    continue;
  }

  for (const src of imgs) imageUrls.add(src.startsWith("http") ? src : `${base}${src}`);
  note(`✓ ${path} — ${sections} section(s), ${imgs.length} image(s)`);
}

// --- images: every referenced image must actually resolve as an image ---
console.log(`checking ${imageUrls.size} unique image URL(s)`);
for (const url of imageUrls) {
  try {
    const { status, type } = await get(url);
    if (status !== 200) fail(`image ${url} — HTTP ${status}`);
    else if (!type.startsWith("image/")) fail(`image ${url} — content-type "${type}"`);
  } catch (err) {
    fail(`image ${url} — request failed: ${err.message}`);
  }
}

if (failures.length) {
  console.log(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`\nOK — ${PAGES.length} pages rendered, ${imageUrls.size} images resolved.`);
