# Media uploads (R2)

This directory is the server side of Sunroom's image uploads: it mints
**presigned** Cloudflare R2 URLs so the browser uploads bytes **directly** to R2
without the file ever passing through the Next.js server.

## The flow

1. **Server** — `r2.ts` `createPresignedUpload(filename, mime, contentLength)`
   signs a `PutObject` URL (scoped to a random `uploads/<uuid>` key, with
   `ContentType` + `ContentLength` **signed** so the byte cap is enforced, not
   advisory). Exposed to the client via `requestUploadAction` in `../actions.ts`.
2. **Browser** — `../editor/use-media-upload.ts` `PUT`s the file straight to that
   presigned URL (`fetch(uploadUrl, { method: "PUT", body: file })`).
3. **Server** — `commitMediaAction` records the `MediaRecord` in the store.

Because step 2 is a **cross-origin PUT from the browser to R2**, two things must
hold or the upload fails. Both bit us on the first real browser upload against
staging; keep them in mind for every deployment (staging _and_ any downstream app
built on `packages/sunroom`).

## Gotcha 1 — SDK request checksums break presigned R2 PUTs (code)

Recent `@aws-sdk/client-s3` defaults `requestChecksumCalculation` to
`"WHEN_SUPPORTED"`. For a **presigned** `PutObject` that stamps an **empty-body**
CRC32 into the URL:

```
…&x-amz-checksum-crc32=AAAAAA==&x-amz-sdk-checksum-algorithm=CRC32&…
```

`AAAAAA==` is the CRC32 of an empty body. The browser then PUTs the **real**
bytes, R2 recomputes the checksum, sees a mismatch, and rejects with **403** —
_even when CORS is correct_.

**Fix (in `r2.ts`):** construct the `S3Client` with

```ts
requestChecksumCalculation: "WHEN_REQUIRED",
```

so a plain `PutObject` presign carries **no** checksum params. Note the value is
the uppercase enum string (`"WHEN_REQUIRED"`, not `"when_required"`) — lowercase
happens to work at runtime but fails `tsc`.

**Regression guard:** `r2.signing.test.ts` asserts the presigned URL contains no
`x-amz-checksum-*` / `x-amz-sdk-checksum-algorithm` params. It uses the real
presigner with fake-but-present credentials (signing is local, no network), so it
fails loudly if a future SDK bump or config change reintroduces the checksum.

## Gotcha 2 — the R2 bucket needs a CORS policy (infra, per bucket)

The browser sends a preflight `OPTIONS` to
`https://<accountId>.r2.cloudflarestorage.com/…` before the `PUT`. If the bucket
has **no CORS policy** allowing the app's origin, R2 returns 403 with no
`Access-Control-Allow-Origin` ("CORS Missing Allow Origin"). Server-side uploads
(e.g. the seed script's `upload-r2-objects.mjs`) never hit this — only browser
uploads do — so a bucket can look fine until the first admin upload.

This is **infrastructure config on the bucket**, not something the code can set at
runtime. Each bucket a Sunroom app uploads to needs a CORS rule allowing that
app's origin. Set it in the Cloudflare dashboard (R2 → the bucket → Settings →
CORS policy), e.g. for the staging app:

```json
[
  {
    "AllowedOrigins": ["https://sunroom-staging.fly.dev"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Swap `AllowedOrigins` for the real app origin(s) per deployment. Public image
**reads** are unaffected — they go through the public `pub-….r2.dev` host
(`R2_PUBLIC_BASE`), not this S3 endpoint.

## Files

- `r2.ts` — presign (`createPresignedUpload`), `deleteObject`, `getR2Config`
  (reads `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` /
  `R2_BUCKET`). The `S3Client` here carries the `WHEN_REQUIRED` opt-out.
- `r2.signing.test.ts` — real-signing regression guards (content-length signed;
  no checksum params).
- `r2.test.ts` — unit tests for config/key handling.
- `../editor/use-media-upload.ts` — the browser-side `PUT` (Gotcha 2's origin).
