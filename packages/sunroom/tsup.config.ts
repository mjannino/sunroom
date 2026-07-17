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
  external: ["react", "react-dom", "next", "arctic", "server-only"],
  esbuildPlugins: [
    preserveDirectivesPlugin({
      directives: ["use client", "use server", "use strict"],
      include: /\.(js|ts|jsx|tsx)$/,
      exclude: /node_modules/,
    }),
  ],
});
