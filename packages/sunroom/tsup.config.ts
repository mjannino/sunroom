import { defineConfig } from "tsup";
import { preserveDirectivesPlugin } from "@hyperse/esbuild-plugin-preserve-directives";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    actions: "src/actions.ts",
    sections: "src/sections/index.tsx",
    "sections-client": "src/sections/client.tsx",
  },
  format: ["esm"],
  dts: {
    // Unlike "sunroom/client" (only reached transitively, via EditorRoot.tsx,
    // and never type-checked as part of the dts rollup graph because nothing
    // exported from the "index" entry structurally needs its inferred type),
    // "sunroom/sections/client" is imported directly by src/sections/index.tsx
    // — which is ITSELF the "sections" tsup entry, so the dts build always
    // type-checks it as a root file. At that point dist/sections-client.d.ts
    // doesn't exist yet (same build is producing it), so plain package.json
    // "exports" resolution 404s and the dts step fails with TS7016. This
    // `paths` mapping is type-check-only (it does not affect the emitted JS,
    // which keeps the real "sunroom/sections/client" specifier unbundled —
    // see the `external` entry below): it tells the dts compiler to resolve
    // the specifier straight to the source file, which is already part of
    // the same multi-entry dts Program (as the "sections-client" entry).
    compilerOptions: {
      paths: {
        "sunroom/sections/client": ["./src/sections/client.tsx"],
      },
    },
  },
  clean: true,
  splitting: true,
  treeshake: false, // REQUIRED: rollup treeshake strips re-added directives
  metafile: true,
  // "sunroom/client" is kept external even though this IS the "sunroom"
  // package's own build: EditorRoot.tsx (server-only) renders PageEditor /
  // PagesScreen (both 'use client') as JSX, and must reach them through the
  // public "sunroom/client" specifier — never a relative source import — so
  // esbuild leaves `import ... from "sunroom/client"` un-bundled in dist/
  // index.js. The CONSUMING app's own bundler (Next) then resolves it as a
  // normal package import, applying its 'use client' boundary to exactly
  // dist/client.js and nothing else. A relative import here would instead
  // get inlined into the same physical chunk as index.js's server-only
  // code, and the directives plugin hoists 'use client' to the top of
  // whatever chunk contains it — silently making unrelated server-only
  // exports (e.g. editor-core.ts's screenFromSegments) client-only too.
  // Caught by the Task 7 HTTP proof: authed /admin 500'd with "Attempted to
  // call screenFromSegments() from the server but screenFromSegments is on
  // the client" — see task-7-report.md.
  external: [
    "react",
    "react-dom",
    "next",
    "arctic",
    "server-only",
    "sunroom/client",
    "sunroom/sections/client",
  ],
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ["use client", "use server", "use strict"],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
});
