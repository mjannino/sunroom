import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("build directive preservation", () => {
  it("keeps use-client/use-server directives in the built output", () => {
    if (!existsSync(new URL("../../dist/index.js", import.meta.url))) {
      // dist is produced by `pnpm build`; skip if not built in this run.
      return;
    }
    const out = execFileSync("node", ["scripts/check-directives.mjs"], {
      cwd: new URL("../../", import.meta.url).pathname,
    });
    expect(out.toString()).toContain("directive check: OK");
  });
});
