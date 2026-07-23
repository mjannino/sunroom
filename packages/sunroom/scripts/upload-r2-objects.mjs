// Upload a directory of files to the Sunroom R2 bucket under a key prefix.
//
// Ops helper for seeding demo/staging media at FIXED storage keys (so a
// content seed that references `seed/foo.jpg` resolves against R2). Unlike the
// admin's presigned-upload path (which mints random `uploads/<uuid>` keys),
// this preserves the source filename: `<sourceDir>/foo.jpg` -> `<prefix>/foo.jpg`.
//
// Usage:
//   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=... \
//     node packages/sunroom/scripts/upload-r2-objects.mjs <sourceDir> <keyPrefix> [--dry-run]
//
// Example (from repo root), matching examples/demo-site's seeded `seed/*.jpg` keys:
//   ... node packages/sunroom/scripts/upload-r2-objects.mjs \
//         examples/demo-site/public/media/seed seed
//
// --dry-run lists what would be uploaded without needing credentials or network.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [sourceDir, rawPrefix] = args.filter((a) => a !== "--dry-run");

if (!sourceDir || !rawPrefix) {
  fail(
    "usage: node upload-r2-objects.mjs <sourceDir> <keyPrefix> [--dry-run]",
  );
}
const prefix = rawPrefix.replace(/\/+$/, ""); // no trailing slash

const dirStat = await stat(sourceDir).catch(() =>
  fail(`sourceDir not found: ${sourceDir}`),
);
if (!dirStat.isDirectory()) fail(`sourceDir is not a directory: ${sourceDir}`);

const entries = await readdir(sourceDir, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile())
  .map((e) => e.name)
  .sort();

if (files.length === 0) fail(`no files in ${sourceDir}`);

const plan = files.map((name) => {
  const ext = extname(name).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) fail(`unsupported file type "${ext}" for ${name}`);
  return { name, key: `${prefix}/${basename(name)}`, contentType };
});

console.log(
  `${dryRun ? "[dry-run] would upload" : "uploading"} ${plan.length} file(s) from ${sourceDir} -> <bucket>/${prefix}/`,
);
for (const p of plan) console.log(`  ${p.name}  ->  ${p.key}  (${p.contentType})`);

if (dryRun) {
  console.log("[dry-run] no credentials used, nothing uploaded.");
  process.exit(0);
}

// Real upload path: validate R2 env, then PutObject each file.
const env = process.env;
const missing = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
].filter((k) => !env[k]);
if (missing.length) fail(`missing R2 env: ${missing.join(", ")}`);

const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

let done = 0;
for (const p of plan) {
  const body = await readFile(join(sourceDir, p.name));
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: p.key,
      Body: body,
      ContentType: p.contentType,
    }),
  );
  done += 1;
  console.log(`  ✓ ${p.key} (${body.length} bytes)`);
}
console.log(`uploaded ${done}/${plan.length} file(s) to <bucket>/${prefix}/`);
