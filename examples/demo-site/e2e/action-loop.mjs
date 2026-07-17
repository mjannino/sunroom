// Drives the REAL create -> add-section -> edit -> save loop by calling the
// REAL exported 'use server' action functions from "sunroom/actions" (the
// exact same functions PagesScreen.tsx / PageEditor.tsx call from the
// browser) — not a reimplementation.
//
// This proves action -> ContentStore -> git commit for real, against the
// SAME .sunroom-content directory the demo's `next start` server serves.
// It intentionally runs in a separate process from that server (Playwright
// isn't available in this environment — no passwordless sudo to install the
// system libs `chromium` needs; see task-7-report.md). Because
// `getStore()`'s index is an in-memory-per-process cache
// (packages/sunroom/src/store/singleton.ts), the running server's own
// process won't see this process's writes until it (re)starts and cold-loads
// the store from disk — so the harness restarts `next start` afterwards and
// then curls it, proving the public render side over real HTTP.
//
// Auth is not faked in spirit: SUNROOM_MOCK_SESSION_COOKIE (set by the caller
// shell script) must hold a cookie value obtained from a real POST to the
// running server's /api/sunroom/auth/owner endpoint. getSession() ->
// verifySession() runs completely unmodified and really checks that
// signature — see node-loader.mjs / fake-next-headers.mjs for what's
// stubbed (only the Next-request-scoped cookie jar plumbing, not any auth
// logic).
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createPageAction, savePageAction } from "sunroom/actions";

const SLUG = process.env.E2E_SLUG ?? "menu";
const TITLE = process.env.E2E_TITLE ?? "Menu";
const HEADING = process.env.E2E_HEADING ?? "Fresh from the loop";
const QUOTE_AUTHOR = process.env.E2E_QUOTE_AUTHOR ?? "Jane";
const RICH_TEXT_BODY =
  process.env.E2E_RICH_TEXT_BODY ?? "<p>Hello <strong>world</strong></p>";

function must(cond, message) {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

console.log(`--- action-loop: create "${SLUG}" ---`);
const created = await createPageAction({ slug: SLUG, title: TITLE });
console.log(JSON.stringify(created));
must(
  created.ok,
  "createPageAction was not ok (is SUNROOM_MOCK_SESSION_COOKIE a real, current owner cookie?)",
);

console.log(`--- action-loop: add hero section + edit heading, then save ---`);
const page = {
  slug: SLUG,
  title: TITLE,
  position: 1,
  seo: {},
  sections: [
    {
      id: randomUUID(),
      type: "hero",
      props: {
        heading: HEADING,
        body: "<p>Added by the create&nbsp;&rarr;&nbsp;edit&nbsp;&rarr;&nbsp;save action loop.</p>",
      },
    },
  ],
};
const saved = await savePageAction(page, created.version ?? null);
console.log(JSON.stringify(saved));
must(saved.ok, "savePageAction was not ok");

console.log(
  "--- action-loop: add testimonials section with a nested array-of-objects field (quotes: [{ quote, author }]), then save ---",
);
// This is the Slice 2 proof: an ARRAY field whose items are OBJECT fields
// (Testimonials' `quotes`), edited and saved through the SAME real
// savePageAction used above — no reimplementation of the reducer or the
// store. `saved.version` is passed as the baseVersion so this is a real
// optimistic-concurrency update of the page just created, exactly like a
// second edit in the admin UI would be.
const pageWithNestedField = {
  ...page,
  sections: [
    ...page.sections,
    {
      id: randomUUID(),
      type: "testimonials",
      props: {
        title: "What our guests say",
        quotes: [
          { quote: "Best brunch in town.", author: QUOTE_AUTHOR },
          { quote: "Cozy and welcoming.", author: "Sam" },
        ],
      },
    },
  ],
};
const savedNested = await savePageAction(
  pageWithNestedField,
  saved.version ?? null,
);
console.log(JSON.stringify(savedNested));
must(savedNested.ok, "savePageAction (nested/array field) was not ok");

console.log(
  "--- action-loop: read the nested field back from the real on-disk content store ---",
);
// GitStore.savePage() writes the page JSON to disk (writeAtomic) and commits
// it BEFORE returning (see packages/sunroom/src/store/git-store.ts), so by
// the time savePageAction above resolved, this file is the same artifact
// the running Next server will cold-load on its next start. Reading it here
// is not a reimplementation of the store — it's the store's own real
// serialized output, read straight off disk.
const contentDir = process.env.SUNROOM_CONTENT_DIR ?? "./.sunroom-content";
const pageFile = join(contentDir, "pages", `${SLUG || "index"}.json`);
const onDisk = JSON.parse(await readFile(pageFile, "utf8"));
const testimonialsSection = onDisk.sections.find(
  (s) => s.type === "testimonials",
);
must(
  !!testimonialsSection,
  `testimonials section missing from on-disk ${pageFile} after save`,
);
must(
  Array.isArray(testimonialsSection.props?.quotes) &&
    testimonialsSection.props.quotes.length === 2,
  `on-disk quotes was not the 2-item array we saved (got ${JSON.stringify(testimonialsSection.props?.quotes)})`,
);
must(
  testimonialsSection.props.quotes[0]?.author === QUOTE_AUTHOR,
  `nested quotes[0].author was not ${JSON.stringify(QUOTE_AUTHOR)} (got ${JSON.stringify(testimonialsSection.props.quotes[0])})`,
);
console.log(
  `OK: nested array/object field round-tripped through the real save — quotes[0] = ${JSON.stringify(testimonialsSection.props.quotes[0])}`,
);

console.log(
  "--- action-loop: edit the Hero's richText `body` field (TipTap-authored HTML) and save ---",
);
// This is the Slice 3 proof: a `richText` field (Hero's `body`, edited via
// TipTap in the real admin UI — see FieldControl.tsx / RichTextControl.tsx)
// saved as an HTML STRING through the SAME real savePageAction used above.
// TipTap's own editing/typing surface can't be driven in jsdom (no real
// contenteditable input events), so this harness proves the part that
// *can* be proven for real outside a browser: the HTML string TipTap's
// `editor.getHTML()` would hand to `onChange` round-trips through
// savePageAction -> GitStore -> disk, and then (after rebuild + restart,
// exactly like the nested-field proof above) renders unescaped on the
// public route via Hero's `dangerouslySetInnerHTML`
// (examples/demo-site/components/Hero.tsx). The actual keystrokes-in-a-
// real-editor gesture is out of jsdom's reach — see the manual checklist
// in README.md.
const pageWithRichText = {
  ...pageWithNestedField,
  sections: [
    {
      ...pageWithNestedField.sections[0],
      props: { ...pageWithNestedField.sections[0].props, body: RICH_TEXT_BODY },
    },
    ...pageWithNestedField.sections.slice(1),
  ],
};
const savedRichText = await savePageAction(
  pageWithRichText,
  savedNested.version ?? null,
);
console.log(JSON.stringify(savedRichText));
must(savedRichText.ok, "savePageAction (richText field) was not ok");

console.log(
  "--- action-loop: read the richText field back from the real on-disk content store ---",
);
const onDiskAfterRichText = JSON.parse(await readFile(pageFile, "utf8"));
const heroSection = onDiskAfterRichText.sections.find((s) => s.type === "hero");
must(
  !!heroSection,
  `hero section missing from on-disk ${pageFile} after richText save`,
);
must(
  heroSection.props?.body === RICH_TEXT_BODY,
  `on-disk hero.body was not the richText HTML we saved (expected ${JSON.stringify(RICH_TEXT_BODY)}, got ${JSON.stringify(heroSection.props?.body)})`,
);
must(
  heroSection.props.body.includes("<strong>world</strong>"),
  `on-disk hero.body did not contain "<strong>world</strong>" (got ${JSON.stringify(heroSection.props.body)})`,
);
console.log(
  `OK: richText field round-tripped through the real save — hero.body = ${JSON.stringify(heroSection.props.body)}`,
);
console.log(
  `NEXT: after a rebuild + restart of the demo server, 'curl -s localhost:3000/${SLUG} | grep -o "<strong>world</strong>"' must render this HTML unescaped (see README.md step 3).`,
);

console.log("--- action-loop: OK ---");
