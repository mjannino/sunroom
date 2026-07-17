import { getAuthConfig } from "./config.js";
import { SESSION_COOKIE, verifySession } from "./session.js";

/** Reads and verifies the session cookie. Returns the identity or null. */
export async function getSession(): Promise<{
  email: string;
  name: string;
} | null> {
  // Both imported lazily: `server-only` throws unconditionally at
  // module-eval time outside an RSC bundler (by design, to catch
  // accidental client-component imports at build time), and `next`'s
  // package.json has no ESM "exports" map so a static deep import breaks
  // plain-Node ESM resolution. Either as a static top-level import breaks
  // plain-Node consumers of this module (e.g. Node scripts that only need
  // `GitStore`) even though both resolve fine inside Next's own bundler.
  // See the identical fix for "next/navigation" in sunroom.tsx.
  await import("server-only");
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = verifySession(token, getAuthConfig().sessionSecret);
  if (!session) return null;
  return { email: session.email, name: session.name };
}
