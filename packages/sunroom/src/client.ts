// Public entry point for 'use client' components (imported as "sunroom/client").
//
// This is its own tsup entry (see tsup.config.ts) so client-component
// modules never share an output chunk with the main "index" entry or the
// "actions" entry. Sharing a chunk collapses distinct 'use client' /
// 'use server' directives onto the same file, which Next's compiler
// rejects ("It's not possible to have both `use client` and `use server`
// directives in the same file"). Verified in the Phase 5 Slice 1 build
// spike (see .superpowers/sdd/task-1-report.md).
//
// Populated by later tasks as editor client components are added, e.g.:
//   export { Editor } from "./admin/editor/editor.js";
export {};
