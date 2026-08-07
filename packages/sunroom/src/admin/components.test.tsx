import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("./session-server.js", () => ({ getSession: () => getSession() }));

import { AuthConfigError } from "./config.js";
import { AdminLayout } from "./components.js";
import { resetStores } from "../store/singleton.js";

let dir: string;
beforeEach(async () => {
  dir = join(
    await mkdtemp(join(tmpdir(), "sunroom-comp-")),
    ".sunroom-content",
  );
  process.env.SUNROOM_CONTENT_DIR = dir;
  resetStores();
});
afterEach(async () => {
  resetStores();
  delete process.env.SUNROOM_CONTENT_DIR;
  await rm(dir, { recursive: true, force: true }).catch(() => {});
});

describe("AdminLayout", () => {
  it("renders the sign-in screen when unauthenticated, not the children", async () => {
    getSession.mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await AdminLayout({ children: "SECRET CHILD" }),
    );
    expect(html).toContain("/api/sunroom/auth/login");
    expect(html).not.toContain("SECRET CHILD");
  });

  it("renders the chrome, the signed-in email, and the children when authenticated", async () => {
    getSession.mockResolvedValue({ email: "jane@acme.com", name: "Jane" });
    const html = renderToStaticMarkup(
      await AdminLayout({ children: "SECRET CHILD" }),
    );
    expect(html).toContain("jane@acme.com");
    expect(html).toContain("SECRET CHILD");
    expect(html).toContain("/api/sunroom/auth/logout");
  });

  it("wraps the output in the sr-admin frame and injects the ADMIN_CSS theme", async () => {
    getSession.mockResolvedValue({ email: "jane@acme.com", name: "Jane" });
    const html = renderToStaticMarkup(
      await AdminLayout({ children: "SECRET CHILD" }),
    );
    expect(html).toContain('class="sr-admin"');
    expect(html).toContain("<style>");
    expect(html).toContain("--sr-accent");
  });

  it("renders a config-error panel instead of throwing when getSession fails with AuthConfigError", async () => {
    getSession.mockRejectedValue(new AuthConfigError(["GOOGLE_CLIENT_ID"]));
    const html = renderToStaticMarkup(
      await AdminLayout({ children: "SECRET CHILD" }),
    );
    expect(html).toContain("GOOGLE_CLIENT_ID");
    expect(html).not.toContain("SECRET CHILD");
    expect(html).not.toContain("/api/sunroom/auth/login");
  });

  it("styles the sign-in button as a dedicated Google button (not the accent CTA)", async () => {
    getSession.mockResolvedValue(null);
    const html = renderToStaticMarkup(await AdminLayout({ children: "X" }));
    expect(html).toContain("sr-btn-google");
    expect(html).not.toContain("sr-btn-primary sr-btn-lg");
  });

  it("shows the configured site name in the top bar", async () => {
    getSession.mockResolvedValue({ email: "jane@acme.com", name: "Jane" });
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    await store.saveSettings(
      {
        seoDefaults: {},
        site: { name: "Mara Voss", madeWith: true },
        redirects: [],
      },
      { author: { name: "Jane", email: "jane@acme.com" } },
    );
    const html = renderToStaticMarkup(await AdminLayout({ children: "X" }));
    expect(html).toContain("Mara Voss");
    expect(html).toContain("sr-sitename");
  });

  it("uses the site name as the sign-in headline + made-with subheading", async () => {
    getSession.mockResolvedValue(null);
    const { getStore } = await import("../store/singleton.js");
    const { resolveConfig } = await import("../core/registry.js");
    const store = await getStore(resolveConfig({ sections: {} }));
    await store.saveSettings(
      {
        seoDefaults: {},
        site: { name: "Mara Voss", madeWith: true },
        redirects: [],
      },
      { author: { name: "Jane", email: "jane@acme.com" } },
    );
    const html = renderToStaticMarkup(await AdminLayout({ children: "X" }));
    expect(html).toContain("Mara Voss");
    expect(html).toContain("made with Sunroom");
  });
});
