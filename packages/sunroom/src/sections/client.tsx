// Public entry point for the section components (imported as
// "sunroom/sections/client"). No "use client" directive here: each
// re-exported module (Gallery.tsx, Hero.tsx, Cta.tsx, provider.tsx) already
// carries its own, and esbuild-plugin-preserve-directives hoists a single
// deduped "use client" to the top of the bundled dist/sections-client.js
// chunk — see src/client.ts for the identical pattern. Adding a second,
// redundant directive here produced TWO "use client" lines in the emitted
// chunk (one hoisted from these files, one from this barrel), which
// scripts/check-directives.mjs correctly flags as a misplaced/inert
// duplicate.
export { default as Gallery } from "./Gallery.js";
export { default as Hero } from "./Hero.js";
export { default as Cta } from "./Cta.js";
export { SectionsProvider, useSections } from "./provider.js";
