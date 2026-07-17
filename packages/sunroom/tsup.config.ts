import { defineConfig } from "tsup";
import { preserveDirectivesPlugin } from "@hyperse/esbuild-plugin-preserve-directives";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
    actions: "src/actions.ts",
  },
  format: ["esm"],
  dts: true,
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
  ],
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ["use client", "use server", "use strict"],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
});
