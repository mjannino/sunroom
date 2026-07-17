// A Node ESM "resolve" hook used ONLY by the e2e action-script
// (`examples/demo-site/e2e/action-loop.mjs`), never by the app itself.
//
// Why this exists: `sunroom/actions` (a real 'use server' entry, built by
// tsup) is designed to be loaded by Next's own bundler, which rewrites bare
// specifiers like "next/headers" and understands the `server-only` build-time
// guard. Node's native ESM resolver does neither:
//
//   - "next/headers", "next/cache" etc. are extensionless bare specifiers.
//     The `next` package ships no "exports" map, so Node's loader requires an
//     exact file match — it won't auto-append ".js" the way a bundler would.
//   - `server-only` is a marker package whose module body unconditionally
//     throws when required outside a bundler's server-graph.
//
// This hook is the harness equivalent of what Next's webpack config does at
// build time: it fixes up module resolution so the REAL, unmodified
// `sunroom/actions` module (savePageAction, createPageAction, ...) can be
// imported and called directly from a plain `node` process. It does not
// change what the action functions do — only how their Next-only imports
// resolve outside of Next.
//
// `next/headers`'s `cookies()` is replaced with a fake that reads a session
// cookie value from `process.env.SUNROOM_MOCK_SESSION_COOKIE` — see
// `fake-next-headers.mjs`. That value is a REAL cookie obtained from the
// REAL running server's owner-login endpoint (not fabricated), so
// `verifySession()` inside `getSession()` runs unmodified and really
// verifies a real signature.
//
// `next/cache`'s `revalidatePath()` is replaced with a no-op logger — see
// `fake-next-cache.mjs`. Real revalidation only makes sense inside a live
// Next request; this script proves the on-disk store + git commit instead,
// then a restarted `next start` cold-loads that same content over real HTTP.

const here = (name) => new URL(name, import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return { url: here("./fake-next-headers.mjs"), shortCircuit: true };
  }
  if (specifier === "next/cache") {
    return { url: here("./fake-next-cache.mjs"), shortCircuit: true };
  }
  if (specifier === "server-only") {
    return { url: here("./fake-empty.mjs"), shortCircuit: true };
  }
  // Any other extensionless "next/xxx" bare import: retry with ".js", which
  // is how these modules actually resolve on disk (see the module's own
  // comment in packages/sunroom/src/sunroom.tsx for the same finding).
  if (/^next\/[a-z-]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }
  return nextResolve(specifier, context);
}
