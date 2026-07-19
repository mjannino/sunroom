import { describe, expect, it } from "vitest";
import { getAuthConfig } from "./config.js";
import { authorizeIdentity, checkOwnerToken, checkState } from "./flow.js";

const config = getAuthConfig({
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  SUNROOM_SESSION_SECRET: "a".repeat(32),
  SUNROOM_EDITORS: "jane@acme.com",
  SUNROOM_OWNER_TOKEN: "correct-owner-token",
});

describe("checkState", () => {
  it("passes only when both are present and equal", () => {
    expect(checkState("abc", "abc")).toBe(true);
    expect(checkState("abc", "xyz")).toBe(false);
    expect(checkState(null, "abc")).toBe(false);
    expect(checkState("abc", undefined)).toBe(false);
    expect(checkState(null, undefined)).toBe(false);
  });
});

describe("authorizeIdentity", () => {
  it("accepts a verified, allowlisted editor", () => {
    expect(
      authorizeIdentity(config, {
        email: "jane@acme.com",
        emailVerified: true,
        name: "Jane",
      }),
    ).toEqual({ ok: true });
  });
  it("rejects an unverified email with 403", () => {
    const d = authorizeIdentity(config, {
      email: "jane@acme.com",
      emailVerified: false,
      name: "Jane",
    });
    expect(d).toEqual({
      ok: false,
      status: 403,
      reason: expect.stringMatching(/verified/i),
    });
  });
  it("rejects a non-allowlisted email with 403", () => {
    const d = authorizeIdentity(config, {
      email: "mallory@evil.com",
      emailVerified: true,
      name: "M",
    });
    expect(d).toEqual({
      ok: false,
      status: 403,
      reason: expect.stringMatching(/authorized|allow/i),
    });
  });
});

describe("checkOwnerToken", () => {
  it("accepts the exact token", () => {
    expect(checkOwnerToken(config.ownerToken, "correct-owner-token")).toBe(
      true,
    );
  });
  it("rejects a wrong token", () => {
    expect(checkOwnerToken(config.ownerToken, "wrong")).toBe(false);
  });
  it("rejects when the configured token is null (route disabled)", () => {
    expect(checkOwnerToken(null, "anything")).toBe(false);
  });
  it("rejects an empty submission", () => {
    expect(checkOwnerToken(config.ownerToken, undefined)).toBe(false);
    expect(checkOwnerToken(config.ownerToken, "")).toBe(false);
  });
});
