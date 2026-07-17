// Stands in for "next/headers" when `sunroom/actions` is imported from a
// plain Node process (see node-loader.mjs for why). Only `cookies()` is
// implemented, because that is all `getSession()`
// (packages/sunroom/src/admin/session-server.ts) uses.
//
// The cookie value itself is NOT fabricated: the harness (action-loop.mjs)
// obtains it from a real POST to the running server's
// /api/sunroom/auth/owner endpoint, so `verifySession()` downstream is
// verifying a real HMAC signature produced by real production code.
export async function cookies() {
  const value = process.env.SUNROOM_MOCK_SESSION_COOKIE ?? "";
  return {
    get(name) {
      if (name !== "sunroom_session" || !value) return undefined;
      return { name, value };
    },
  };
}
