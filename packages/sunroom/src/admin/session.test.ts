import { describe, expect, it } from "vitest";
import { newSession, signSession, verifySession } from "./session.js";

const SECRET = "test-secret";
const NOW = 1_000_000_000_000;

describe("session sign/verify", () => {
  it("round-trips a valid session", () => {
    const payload = newSession("jane@acme.com", "Jane", NOW);
    const token = signSession(payload, SECRET);
    expect(verifySession(token, SECRET, NOW)).toEqual(payload);
  });

  it("sets exp 30 days out", () => {
    const payload = newSession("jane@acme.com", "Jane", NOW);
    expect(payload.exp).toBe(NOW + 2_592_000_000);
  });

  it("rejects an expired session", () => {
    const payload = newSession("jane@acme.com", "Jane", NOW);
    const token = signSession(payload, SECRET);
    expect(verifySession(token, SECRET, payload.exp + 1)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signSession(newSession("jane@acme.com", "Jane", NOW), SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ email: "mallory@evil.com", name: "M", exp: NOW + 1e9 }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signSession(newSession("jane@acme.com", "Jane", NOW), SECRET);
    const [payload] = token.split(".");
    expect(verifySession(`${payload}.AAAA`, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession(newSession("jane@acme.com", "Jane", NOW), SECRET);
    expect(verifySession(token, "other-secret", NOW)).toBeNull();
  });

  it("rejects undefined, empty, and malformed tokens", () => {
    expect(verifySession(undefined, SECRET, NOW)).toBeNull();
    expect(verifySession("", SECRET, NOW)).toBeNull();
    expect(verifySession("no-dot", SECRET, NOW)).toBeNull();
    expect(verifySession(".", SECRET, NOW)).toBeNull();
  });
});
