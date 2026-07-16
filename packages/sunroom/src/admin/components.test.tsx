import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("./session-server.js", () => ({ getSession: () => getSession() }));

import { AdminLayout } from "./components.js";

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
});
