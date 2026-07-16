import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  email: string;
  name: string;
  /** Epoch ms expiry. */
  exp: number;
}

export const SESSION_COOKIE = "sunroom_session";
export const SESSION_TTL_MS = 2_592_000_000; // 30 days

export const STATE_COOKIE = "sunroom_oauth_state";
export const VERIFIER_COOKIE = "sunroom_oauth_verifier";
export const TXN_TTL_S = 600; // 10 minutes

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function newSession(
  email: string,
  name: string,
  now: number = Date.now(),
): SessionPayload {
  return { email, name, exp: now + SESSION_TTL_MS };
}

export function signSession(payload: SessionPayload, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = hmac(payloadB64, secret).toString("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const expected = hmac(payloadB64, secret);
  const provided = Buffer.from(sigB64, "base64url");
  // timingSafeEqual throws on length mismatch; guard first. HMAC-SHA256 is
  // always 32 bytes, so a length mismatch (including a malformed signature
  // that decodes to the wrong number of bytes) is rejected here.
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as SessionPayload).email !== "string" ||
    typeof (payload as SessionPayload).name !== "string" ||
    typeof (payload as SessionPayload).exp !== "number"
  ) {
    return null;
  }

  const session = payload as SessionPayload;
  if (session.exp <= now) return null;
  return session;
}
