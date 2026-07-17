// Public entry point for 'use server' actions (imported as "sunroom/actions").
//
// This is its own tsup entry (see tsup.config.ts) so 'use server' action
// modules never share an output chunk with the main "index" entry or the
// "client" entry — see client.ts for why that matters. It also keeps a
// "use server" file's exports limited to async functions, which is a
// requirement of the React Server Actions convention (a module can't mix
// `use server` with non-function exports like classes or constants).
// Verified in the Phase 5 Slice 1 build spike (see
// .superpowers/sdd/task-1-report.md).
//
export {
  savePageAction,
  createPageAction,
  deletePageAction,
  reorderPagesAction,
} from "./admin/actions.js";
