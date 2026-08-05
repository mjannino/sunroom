// Deletes EVERY object in the staging R2 bucket. Runs on the GitHub runner —
// never baked into any image (see guards.mjs for the insulation invariant).
//
// Env:
//   R2_BUCKET, R2_PUBLIC_HOST            (asserted against the staging allowlist)
//   R2_ACCOUNT_ID                        (R2 S3 endpoint host)
//   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
//
// Usage: node ops/reset-staging/wipe-bucket.mjs

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { pathToFileURL } from "node:url";
import { assertStagingTarget } from "./guards.mjs";

// Lists and deletes all objects, following pagination. Returns the count
// deleted. Each ListObjectsV2 page is capped at 1000 keys by S3, and
// DeleteObjects accepts up to 1000, so one delete per page stays in bounds.
// Throws if any deletion fails — fail-fast to prevent silent partial success.
export async function deleteAllObjects(client, bucket) {
  let deleted = 0;
  let ContinuationToken;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken }),
    );
    const objects = (page.Contents ?? []).map((o) => ({ Key: o.Key }));
    if (objects.length > 0) {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      // Fail-fast if any deletions fail, even with Quiet: true (Quiet only
      // suppresses success list, not error list).
      if (response.Errors && response.Errors.length > 0) {
        const first = response.Errors[0];
        throw new Error(
          `failed to delete ${response.Errors.length} object(s): "${first.Key}" (${first.Code}: ${first.Message})`,
        );
      }
      deleted += objects.length;
    }
    ContinuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (ContinuationToken);
  return deleted;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`error: missing required env ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const bucket = requireEnv("R2_BUCKET");
  const host = requireEnv("R2_PUBLIC_HOST");
  // Last line of defense: refuse anything that is not the staging target.
  assertStagingTarget({ bucket, host });

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  console.log(`wiping all objects from bucket "${bucket}"...`);
  const deleted = await deleteAllObjects(client, bucket);
  console.log(`deleted ${deleted} object(s) from "${bucket}".`);
}

// Run main() only when executed directly, not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
