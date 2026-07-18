import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedUrl } = vi.hoisted(() => ({ getSignedUrl: vi.fn() }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...a: unknown[]) => getSignedUrl(...a),
}));

const { send, PutObjectCommand, DeleteObjectCommand } = vi.hoisted(() => {
  class PutObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class DeleteObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return { send: vi.fn(), PutObjectCommand, DeleteObjectCommand };
});
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
  },
  PutObjectCommand,
  DeleteObjectCommand,
}));

import {
  createPresignedUpload,
  deleteObject,
  getR2Config,
  R2ConfigError,
} from "./r2.js";

const ENV = {
  R2_ACCOUNT_ID: "acct",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "my-bucket",
};

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
  vi.clearAllMocks();
});
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k];
});

describe("getR2Config", () => {
  it("reads the env", () => {
    expect(getR2Config().bucket).toBe("my-bucket");
  });
  it("throws R2ConfigError naming every missing var", () => {
    for (const k of Object.keys(ENV)) delete process.env[k];
    try {
      getR2Config();
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(R2ConfigError);
      expect((e as Error).message).toContain("R2_ACCOUNT_ID");
      expect((e as Error).message).toContain("R2_BUCKET");
    }
  });
});

describe("createPresignedUpload", () => {
  it("generates a uuid storageKey with the file extension and presigns a PutObjectCommand", async () => {
    getSignedUrl.mockResolvedValue("https://presigned.example/put");
    const { uploadUrl, storageKey } = await createPresignedUpload(
      "photo.JPG",
      "image/jpeg",
    );
    expect(uploadUrl).toBe("https://presigned.example/put");
    expect(storageKey).toMatch(/^uploads\/[0-9a-f-]{36}\.jpg$/); // lowercased ext, uuid
    // the presigned command targeted the right bucket/key/content-type
    const [, command] = getSignedUrl.mock.calls[0]!;
    expect(command.input).toMatchObject({
      Bucket: "my-bucket",
      Key: storageKey,
      ContentType: "image/jpeg",
    });
  });
  it("falls back to a mime-derived extension when the filename has none", async () => {
    getSignedUrl.mockResolvedValue("u");
    const { storageKey } = await createPresignedUpload("noext", "image/png");
    expect(storageKey).toMatch(/\.png$/);
  });
});

describe("deleteObject", () => {
  it("sends a DeleteObjectCommand for the key", async () => {
    await deleteObject("uploads/x.jpg");
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      (send.mock.calls[0]![0] as InstanceType<typeof DeleteObjectCommand>)
        .input,
    ).toMatchObject({ Bucket: "my-bucket", Key: "uploads/x.jpg" });
  });
});
