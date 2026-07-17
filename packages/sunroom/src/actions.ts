// Public entry point for 'use server' actions (imported as "sunroom/actions").
//
// This is its own tsup entry (see tsup.config.ts) so 'use server' action
// modules never share an output chunk with the main "index" entry or the
// "client" entry — see client.ts for why that matters. The underlying
// module (admin/actions.ts) does NOT use a module-level 'use server'
// directive; each exported action function instead carries its own inline
// `"use server"` as the first statement of its body (checked by
// scripts/check-directives.mjs, which only accepts that inline form for
// `'use server'`, never for `'use client'`). That per-function form is the
// documented Next/React pattern for marking an individual async function as
// a Server Function without requiring every export reachable from the same
// bundled chunk to satisfy the "only async exports" rule — a real
// constraint here because EditorRoot.tsx (reached from the "index" entry)
// also imports these action functions directly, so a module-level directive
// risked getting hoisted onto a chunk shared with non-function exports from
// other modules (see the Task 4 cross-entry collision fix,
// .superpowers/sdd/task-4-report.md). Verified in the Phase 5 Slice 1 build
// spike (see .superpowers/sdd/task-1-report.md).
//
export {
  savePageAction,
  createPageAction,
  deletePageAction,
  reorderPagesAction,
} from "./admin/actions.js";
