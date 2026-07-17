import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { AuthConfigError, getAuthConfig } from "./config.js";
import { createHandlers, errorPage } from "./handlers.js";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  verifySession,
} from "./session.js";

const config = getAuthConfig({
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  SUNROOM_SESSION_SECRET: "sessionsecret",
  SUNROOM_EDITORS: "jane@acme.com",
  SUNROOM_URL: "https://acme.com",
  SUNROOM_OWNER_TOKEN: "owner-token",
});

function handlers(overrides: Parameters<typeof createHandlers>[0] = {}) {
  return createHandlers({ getConfig: () => config, ...overrides });
}

describe("GET login", () => {
  it("redirects to the arctic authorization URL and sets txn cookies", async () => {
    const h = handlers({
      buildAuthorization: () => ({
        url: "https://accounts.google.com/auth?x=1",
        state: "st",
        codeVerifier: "ver",
      }),
    });
    const res = await h.GET(
      new NextRequest("https://acme.com/api/sunroom/auth/login"),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "https://accounts.google.com/auth?x=1",
    );
    const setCookie = res.headers.getSetCookie().join("\n");
    expect(setCookie).toContain(`${STATE_COOKIE}=st`);
    expect(setCookie).toContain(`${VERIFIER_COOKIE}=ver`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toMatch(/SameSite=Lax/i);
  });
});

describe("GET callback", () => {
  function callbackReq(query: string, cookies: Record<string, string>) {
    const req = new NextRequest(
      `https://acme.com/api/sunroom/auth/callback?${query}`,
    );
    for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
    return req;
  }

  it("sets a session and redirects to /admin for a valid, allowlisted editor", async () => {
    const h = handlers({
      exchangeCode: async () => ({
        email: "jane@acme.com",
        emailVerified: true,
        name: "Jane",
      }),
    });
    const res = await h.GET(
      callbackReq("code=abc&state=st", {
        [STATE_COOKIE]: "st",
        [VERIFIER_COOKIE]: "ver",
      }),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://acme.com/admin");
    const session = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    const token = session!.split(";")[0]!.split("=")[1];
    expect(verifySession(token, config.sessionSecret)?.email).toBe(
      "jane@acme.com",
    );
  });

  it("rejects a state mismatch with 400 and no session", async () => {
    const h = handlers({
      exchangeCode: async () => ({
        email: "jane@acme.com",
        emailVerified: true,
        name: "Jane",
      }),
    });
    const res = await h.GET(
      callbackReq("code=abc&state=WRONG", {
        [STATE_COOKIE]: "st",
        [VERIFIER_COOKIE]: "ver",
      }),
    );
    expect(res.status).toBe(400);
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });

  it("rejects a non-allowlisted email with 403 and no session", async () => {
    const h = handlers({
      exchangeCode: async () => ({
        email: "mallory@evil.com",
        emailVerified: true,
        name: "M",
      }),
    });
    const res = await h.GET(
      callbackReq("code=abc&state=st", {
        [STATE_COOKIE]: "st",
        [VERIFIER_COOKIE]: "ver",
      }),
    );
    expect(res.status).toBe(403);
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });

  it("rejects an unverified email with 403", async () => {
    const h = handlers({
      exchangeCode: async () => ({
        email: "jane@acme.com",
        emailVerified: false,
        name: "Jane",
      }),
    });
    const res = await h.GET(
      callbackReq("code=abc&state=st", {
        [STATE_COOKIE]: "st",
        [VERIFIER_COOKIE]: "ver",
      }),
    );
    expect(res.status).toBe(403);
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });
});

describe("POST owner", () => {
  async function ownerReq(token: string) {
    const body = new URLSearchParams({ token });
    return new NextRequest("https://acme.com/api/sunroom/auth/owner", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  }

  it("mints an owner session for the correct token", async () => {
    const res = await handlers().POST(await ownerReq("owner-token"));
    expect(res.status).toBe(303);
    const session = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(
      verifySession(session!.split(";")[0]!.split("=")[1], config.sessionSecret)
        ?.email,
    ).toBe("owner@sunroom.local");
  });

  it("rejects a wrong token with 403 and no session", async () => {
    const res = await handlers().POST(await ownerReq("nope"));
    expect(res.status).toBe(403);
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });
});

describe("POST logout", () => {
  it("clears the session cookie and redirects to /admin", async () => {
    const res = await handlers().POST(
      new NextRequest("https://acme.com/api/sunroom/auth/logout", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://acme.com/admin");
    const cleared = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });
});

describe("config errors", () => {
  it("GET returns a clear 500 instead of throwing when getConfig fails", async () => {
    const h = createHandlers({
      getConfig: () => {
        throw new AuthConfigError(["GOOGLE_CLIENT_ID"]);
      },
    });
    const res = await h.GET(
      new NextRequest("https://acme.com/api/sunroom/auth/login"),
    );
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("GOOGLE_CLIENT_ID");
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });

  it("POST returns a clear 500 instead of throwing when getConfig fails", async () => {
    const h = createHandlers({
      getConfig: () => {
        throw new AuthConfigError(["GOOGLE_CLIENT_ID"]);
      },
    });
    const res = await h.POST(
      new NextRequest("https://acme.com/api/sunroom/auth/logout", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("GOOGLE_CLIENT_ID");
    expect(
      res.headers
        .getSetCookie()
        .some((c) => c.startsWith(`${SESSION_COOKIE}=`)),
    ).toBe(false);
  });
});

describe("errorPage", () => {
  it("escapes HTML in the message so it cannot inject markup", async () => {
    const res = await errorPage("<script>alert(1)</script>", 400);
    const text = await res.text();
    expect(text).not.toContain("<script>alert(1)</script>");
    expect(text).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
