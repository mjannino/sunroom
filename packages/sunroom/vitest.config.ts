import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./src/test/empty.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // Client-component tests (Task 2+) render with react-dom into jsdom;
    // everything else keeps the default "node" environment.
    environmentMatchGlobs: [["src/admin/editor/**/*.test.tsx", "jsdom"]],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Needed so @testing-library/react's built-in afterEach(cleanup) can
    // register itself (it detects a global `afterEach`); all existing test
    // files still import describe/it/expect/vi explicitly from "vitest".
    globals: true,
  },
});
