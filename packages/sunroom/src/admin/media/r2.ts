import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class R2ConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Sunroom media (R2) is misconfigured. Missing: ${missing.join(", ")}`,
    );
    this.name = "R2ConfigError";
  }
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function getR2Config(env: NodeJS.ProcessEnv = process.env): R2Config {
  const missing: string[] = [];
  const req = (k: string): string => {
    const v = env[k];
    if (!v) missing.push(k);
    return v ?? "";
  };
  const cfg = {
    accountId: req("R2_ACCOUNT_ID"),
    accessKeyId: req("R2_ACCESS_KEY_ID"),
    secretAccessKey: req("R2_SECRET_ACCESS_KEY"),
    bucket: req("R2_BUCKET"),
  };
  if (missing.length) throw new R2ConfigError(missing);
  return cfg;
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

function extFor(filename: string, mime: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot > 0) return filename.slice(dot).toLowerCase();
  return MIME_EXT[mime] ?? "";
}

function client(cfg: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export async function createPresignedUpload(
  filename: string,
  mime: string,
): Promise<{ uploadUrl: string; storageKey: string }> {
  const cfg = getR2Config();
  const storageKey = `uploads/${randomUUID()}${extFor(filename, mime)}`;
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: storageKey,
    ContentType: mime,
  });
  const uploadUrl = await getSignedUrl(client(cfg), command, {
    expiresIn: 600,
  });
  return { uploadUrl, storageKey };
}

export async function deleteObject(storageKey: string): Promise<void> {
  const cfg = getR2Config();
  await client(cfg).send(
    new DeleteObjectCommand({ Bucket: cfg.bucket, Key: storageKey }),
  );
}
