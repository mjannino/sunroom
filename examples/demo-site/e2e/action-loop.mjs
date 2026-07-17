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
import { createPageAction, savePageAction } from "sunroom/actions";

const SLUG = process.env.E2E_SLUG ?? "menu";
const TITLE = process.env.E2E_TITLE ?? "Menu";
const HEADING = process.env.E2E_HEADING ?? "Fresh from the loop";

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

console.log("--- action-loop: OK ---");
