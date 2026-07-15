import { createHash } from "node:crypto";

/**
 * The optimistic-concurrency token for a page: a hash of its exact file bytes.
 *
 * A content hash rather than a git SHA, so reads need no git call and the
 * store's correctness does not depend on git plumbing.
 */
export function contentVersion(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}
