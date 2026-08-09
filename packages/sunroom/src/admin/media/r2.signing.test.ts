import { afterEach, beforeEach, describe, expect, it } from "vitest";

// NO mocks here: this file exercises the REAL @aws-sdk presigner + S3Client so
// the regression guard proves the upload byte-cap is enforced by the signature
// (ContentLength lands in X-Amz-SignedHeaders), not merely advisory. Signing is
// local (no network), so the presign is deterministic with fake-but-present
// credentials.
import { createPresignedUpload } from "./r2.js";

const ENV = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "my-bucket",
};

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
});
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k];
});

describe("createPresignedUpload (real signing)", () => {
  it("signs content-length into the URL so the byte cap is enforced, not advisory", async () => {
    const { uploadUrl } = await createPresignedUpload(
      "x.jpg",
      "image/jpeg",
      1234,
    );
    const signedHeaders = decodeURIComponent(
      new URL(uploadUrl).searchParams.get("X-Amz-SignedHeaders") ?? "",
    );
    expect(signedHeaders.split(";")).toContain("content-length");
  });

  it("does NOT bake a request checksum into the presigned PUT (R2 rejects the empty-body CRC32)", async () => {
    // Recent @aws-sdk/client-s3 defaults requestChecksumCalculation to
    // "when_supported", which stamps an empty-body checksum
    // (x-amz-checksum-crc32=AAAAAA==) + x-amz-sdk-checksum-algorithm into the
    // presigned URL. The browser then PUTs the REAL bytes, so R2 sees a checksum
    // mismatch and returns 403. The client must opt out ("when_required") so no
    // checksum params appear on a plain PutObject presign.
    const { uploadUrl } = await createPresignedUpload(
      "x.jpg",
      "image/jpeg",
      1234,
    );
    const params = new URL(uploadUrl).searchParams;
    expect(params.has("x-amz-sdk-checksum-algorithm")).toBe(false);
    expect(
      [...params.keys()].some((k) => k.startsWith("x-amz-checksum-")),
    ).toBe(false);
  });
});
