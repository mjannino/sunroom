import { beforeEach, describe, expect, it, vi } from "vitest";

const decodeIdToken = vi.fn();
const validateAuthorizationCode = vi.fn();
const createAuthorizationURL = vi.fn();

vi.mock("arctic", () => ({
  Google: class {
    createAuthorizationURL = createAuthorizationURL;
    validateAuthorizationCode = validateAuthorizationCode;
  },
  generateState: () => "test-state",
  generateCodeVerifier: () => "test-verifier",
  decodeIdToken: (t: string) => decodeIdToken(t),
}));

import { getAuthConfig } from "./config.js";
import { buildAuthorization, exchangeCode } from "./google.js";

const config = getAuthConfig({
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  SUNROOM_SESSION_SECRET: "a".repeat(32),
  SUNROOM_EDITORS: "jane@acme.com",
});
const REDIRECT = "https://acme.com/api/sunroom/auth/callback";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildAuthorization", () => {
  it("returns the url, state, and verifier with the right scopes", () => {
    createAuthorizationURL.mockReturnValue(
      new URL("https://accounts.google.com/o/oauth2/v2/auth?x=1"),
    );
    const auth = buildAuthorization(config, REDIRECT);
    expect(auth.state).toBe("test-state");
    expect(auth.codeVerifier).toBe("test-verifier");
    expect(auth.url).toBe("https://accounts.google.com/o/oauth2/v2/auth?x=1");
    expect(createAuthorizationURL).toHaveBeenCalledWith(
      "test-state",
      "test-verifier",
      ["openid", "profile", "email"],
    );
  });
});

describe("exchangeCode", () => {
  it("normalises the id-token claims into a GoogleIdentity", async () => {
    validateAuthorizationCode.mockResolvedValue({ idToken: () => "jwt" });
    decodeIdToken.mockReturnValue({
      email: "Jane@Acme.com",
      email_verified: true,
      name: "Jane",
    });

    const identity = await exchangeCode(config, REDIRECT, "code", "verifier");
    expect(identity).toEqual({
      email: "Jane@Acme.com",
      emailVerified: true,
      name: "Jane",
    });
    expect(validateAuthorizationCode).toHaveBeenCalledWith("code", "verifier");
  });

  it("defaults a missing name and a missing email_verified to safe values", async () => {
    validateAuthorizationCode.mockResolvedValue({ idToken: () => "jwt" });
    decodeIdToken.mockReturnValue({ email: "jane@acme.com" });
    const identity = await exchangeCode(config, REDIRECT, "code", "verifier");
    expect(identity.emailVerified).toBe(false);
    expect(identity.name).toBe("jane@acme.com");
  });

  it("throws when the id token has no email", async () => {
    validateAuthorizationCode.mockResolvedValue({ idToken: () => "jwt" });
    decodeIdToken.mockReturnValue({ name: "No Email" });
    await expect(
      exchangeCode(config, REDIRECT, "code", "verifier"),
    ).rejects.toThrow(/email/i);
  });

  it("propagates an arctic failure", async () => {
    validateAuthorizationCode.mockRejectedValue(new Error("arctic boom"));
    await expect(
      exchangeCode(config, REDIRECT, "code", "verifier"),
    ).rejects.toThrow("arctic boom");
  });
});
