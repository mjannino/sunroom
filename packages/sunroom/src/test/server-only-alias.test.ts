import { describe, expect, it } from "vitest";

describe("server-only alias", () => {
  it('lets a module that imports "server-only" be imported in tests', async () => {
    // This import throws at module-eval time if the alias is not configured,
    // because the real `server-only` package throws outside an RSC bundler.
    await import("server-only");
    expect(true).toBe(true);
  });
});
