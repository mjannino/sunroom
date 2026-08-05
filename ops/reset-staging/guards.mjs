// Target allowlist for the staging reset. ZERO dependencies and ZERO side
// effects, so the security-critical check is unit-testable anywhere and cannot
// be weakened without a failing test.
//
// INSULATION INVARIANT: nothing in ops/reset-staging/ may move under packages/
// (published to client apps) or examples/ (copied as a template). It is
// excluded from the Docker image via .dockerignore. The reset is CI-only.

export const STAGING_BUCKET = "sunroom-staging";
export const STAGING_HOST = "pub-18cb94aab54b4f77961ec038e2ac9878.r2.dev";

// Throws unless the given R2 target is exactly staging. Callers MUST invoke this
// before any destructive operation — the last line of defense if the workflow
// is ever pointed at the wrong bucket.
export function assertStagingTarget({ bucket, host }) {
  if (bucket !== STAGING_BUCKET) {
    throw new Error(
      `refusing to wipe: bucket "${bucket}" is not the staging bucket "${STAGING_BUCKET}"`,
    );
  }
  if (host !== STAGING_HOST) {
    throw new Error(
      `refusing to wipe: R2 public host "${host}" is not the staging host "${STAGING_HOST}"`,
    );
  }
}
