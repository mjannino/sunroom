import type {
  NextRequest,
  NextResponse as NextResponseType,
} from "next/server";
import type { AuthConfig } from "./config.js";
import { AuthConfigError, callbackUrl, getAuthConfig } from "./config.js";
import { authorizeIdentity, checkOwnerToken, checkState } from "./flow.js";
import { buildAuthorization, exchangeCode } from "./google.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STATE_COOKIE,
  TXN_TTL_S,
  VERIFIER_COOKIE,
  newSession,
  signSession,
} from "./session.js";

export interface HandlerDeps {
  getConfig(): AuthConfig;
  buildAuthorization: typeof buildAuthorization;
  exchangeCode: typeof exchangeCode;
}

export interface SunroomHandlers {
  GET(req: NextRequest): Promise<Response>;
  POST(req: NextRequest): Promise<Response>;
}

const OWNER_EMAIL = "owner@sunroom.local";

const txnCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: TXN_TTL_S,
} as const;
const sessionCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
} as const;

// Both imported lazily: `server-only` throws unconditionally at
// module-eval time outside an RSC bundler (by design, to catch accidental
// client-component imports at build time), and `next`'s package.json has
// no ESM "exports" map so a static deep import breaks plain-Node ESM
// resolution. Either as a static top-level import breaks plain-Node
// consumers of this module (e.g. Node scripts that only need `GitStore`)
// even though both resolve fine inside Next's own bundler. See the
// identical fix for "next/headers" in session-server.ts. Memoized so
// repeated calls within one request don't re-trigger the dynamic import.
let nextServerPromise: Promise<typeof import("next/server")> | undefined;
async function nextServer(): Promise<typeof import("next/server")> {
  await import("server-only");
  return (nextServerPromise ??= import("next/server"));
}

function action(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

function origin(req: NextRequest): string {
  return req.nextUrl.origin;
}

function setSession(
  res: NextResponseType,
  config: AuthConfig,
  email: string,
  name: string,
): void {
  res.cookies.set(
    SESSION_COOKIE,
    signSession(newSession(email, name), config.sessionSecret),
    sessionCookie,
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function errorPage(
  message: string,
  status: 400 | 403,
): Promise<NextResponseType> {
  const { NextResponse } = await nextServer();
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Sign-in error</title><body style="font-family:system-ui;padding:2rem"><h1>Cannot sign you in</h1><p>${escapeHtml(message)}</p><p><a href="/admin">Back</a></p></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function configErrorResponse(
  err: AuthConfigError,
): Promise<NextResponseType> {
  const { NextResponse } = await nextServer();
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Sunroom misconfigured</title><body style="font-family:system-ui;padding:2rem"><h1>Sunroom is misconfigured</h1><p>${escapeHtml(err.message)}</p></body>`,
    { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export function createHandlers(
  deps: Partial<HandlerDeps> = {},
): SunroomHandlers {
  const getConfig = deps.getConfig ?? getAuthConfig;
  const build = deps.buildAuthorization ?? buildAuthorization;
  const exchange = deps.exchangeCode ?? exchangeCode;

  async function GET(req: NextRequest): Promise<Response> {
    const { NextResponse } = await nextServer();

    let config: AuthConfig;
    try {
      config = getConfig();
    } catch (err) {
      if (err instanceof AuthConfigError) return configErrorResponse(err);
      throw err;
    }

    if (action(req) === "login") {
      const redirectUri = callbackUrl(config, origin(req));
      const authz = build(config, redirectUri);
      const res = NextResponse.redirect(authz.url, 302);
      res.cookies.set(STATE_COOKIE, authz.state, txnCookie);
      res.cookies.set(VERIFIER_COOKIE, authz.codeVerifier, txnCookie);
      return res;
    }

    if (action(req) === "callback") {
      const returnedState = req.nextUrl.searchParams.get("state");
      const code = req.nextUrl.searchParams.get("code");
      const storedState = req.cookies.get(STATE_COOKIE)?.value;
      const verifier = req.cookies.get(VERIFIER_COOKIE)?.value;

      const clearTxn = (res: NextResponseType): NextResponseType => {
        res.cookies.delete(STATE_COOKIE);
        res.cookies.delete(VERIFIER_COOKIE);
        return res;
      };

      if (!checkState(returnedState, storedState) || !code || !verifier) {
        return clearTxn(
          await errorPage(
            "Your sign-in link expired or was tampered with. Please try again.",
            400,
          ),
        );
      }

      let identity;
      try {
        identity = await exchange(
          config,
          callbackUrl(config, origin(req)),
          code,
          verifier,
        );
      } catch {
        return clearTxn(
          await errorPage("Google sign-in failed. Please try again.", 400),
        );
      }

      const decision = authorizeIdentity(config, identity);
      if (!decision.ok)
        return clearTxn(await errorPage(decision.reason, decision.status));

      const res = NextResponse.redirect(new URL("/admin", origin(req)), 302);
      setSession(res, config, identity.email, identity.name);
      return clearTxn(res);
    }

    return new NextResponse("Not found", { status: 404 });
  }

  async function POST(req: NextRequest): Promise<Response> {
    const { NextResponse } = await nextServer();

    let config: AuthConfig;
    try {
      config = getConfig();
    } catch (err) {
      if (err instanceof AuthConfigError) return configErrorResponse(err);
      throw err;
    }

    if (action(req) === "owner") {
      const form = await req.formData();
      const token = form.get("token");
      if (
        !checkOwnerToken(
          config.ownerToken,
          typeof token === "string" ? token : undefined,
        )
      ) {
        return errorPage("Invalid owner token.", 403);
      }
      // 303 See Other: force the browser to GET /admin after this POST.
      const res = NextResponse.redirect(new URL("/admin", origin(req)), 303);
      setSession(res, config, OWNER_EMAIL, "Owner");
      return res;
    }

    if (action(req) === "logout") {
      const res = NextResponse.redirect(new URL("/admin", origin(req)), 303);
      res.cookies.set(SESSION_COOKIE, "", { ...sessionCookie, maxAge: 0 });
      return res;
    }

    return new NextResponse("Not found", { status: 404 });
  }

  return { GET, POST };
}
