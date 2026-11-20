import { describe, it, expect } from "bun:test";
import { buildAuthorizeUrl, buildReturnUrl, checkFinish, codeChallenge, randomUrlSafe, reconnectResets, tokenExpiries } from "./garmin-oauth";
import { decryptToken, encryptToken } from "./garmin-crypto";

const KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
const OTHER_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));

describe("PKCE", () => {
  it("matches the RFC 7636 example", async () => {
    expect(await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"))
      .toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("creates verifiers of a length and alphabet Garmin accepts", () => {
    const verifier = randomUrlSafe(48);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("builds the authorize URL with every required parameter", () => {
    const url = new URL(buildAuthorizeUrl({ clientId: "c", challenge: "x", state: "s", redirectUri: "https://r/cb" }));
    expect(url.origin + url.pathname).toBe("https://connect.garmin.com/oauth2Confirm");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "c",
      code_challenge: "x",
      code_challenge_method: "S256",
      redirect_uri: "https://r/cb",
      state: "s",
    });
  });
});

describe("return URL", () => {
  it("never contains the text Supabase auth intercepts", () => {
    expect(buildReturnUrl("pending", randomUrlSafe(32))).not.toContain("code=");
    expect(buildReturnUrl("declined")).toBe("hiitfitness://garmin-connected?status=declined");
  });
});

describe("checkFinish", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");
  const row = { user_id: "a", expires_at: "2026-11-05T12:05:00Z", used_at: null };

  it("accepts the user who started the flow", () => {
    expect(checkFinish(row, "a", now)).toEqual({ ok: true });
  });
  it("rejects a different signed-in user", () => {
    expect(checkFinish(row, "victim", now)).toEqual({ ok: false, reason: "wrong_user" });
  });
  it("rejects used, expired and unknown results", () => {
    expect(checkFinish({ ...row, used_at: "2026-11-05T11:59:00Z" }, "a", now)).toEqual({ ok: false, reason: "used" });
    expect(checkFinish({ ...row, expires_at: "2026-11-05T11:00:00Z" }, "a", now)).toEqual({ ok: false, reason: "expired" });
    expect(checkFinish(null, "a", now)).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("token handling", () => {
  it("works out both expiries from Garmin's response", () => {
    const now = Date.parse("2026-11-05T00:00:00Z");
    expect(tokenExpiries({ access_token: "", refresh_token: "", expires_in: 86400, refresh_token_expires_in: 7775998 }, now))
      .toEqual({ access_expires_at: "2026-11-06T00:00:00.000Z", refresh_expires_at: "2027-02-02T23:59:58.000Z" });
  });

  it("round-trips an encrypted token with a fresh IV", async () => {
    const a = await encryptToken("secret", KEY);
    const b = await encryptToken("secret", KEY);
    expect(a).not.toBe(b);
    expect(a).not.toContain("secret");
    expect(await decryptToken(a, KEY)).toBe("secret");
  });

  it("refuses a wrong key or tampered value", async () => {
    const stored = await encryptToken("secret", KEY);
    expect(decryptToken(stored, OTHER_KEY)).rejects.toThrow();
    const [iv] = stored.split(".");
    expect(decryptToken(`${iv}.${btoa("tampered-value-16")}`, KEY)).rejects.toThrow();
  });

  it("rejects a key of the wrong size", () => {
    expect(encryptToken("secret", btoa("short"))).rejects.toThrow("32 bytes");
  });
});

describe("reconnectResets", () => {
  it("changes nothing on a first connection", () => {
    expect(reconnectResets(null, "g1")).toEqual({ consents: false, workoutLinks: false });
  });

  it("resumes a dropped connection as it was", () => {
    expect(reconnectResets({ status: "needs_reconnect", garmin_user_id: "g1" }, "g1"))
      .toEqual({ consents: false, workoutLinks: false });
  });

  it("asks for consent again after a real disconnect, but keeps valid IDs", () => {
    expect(reconnectResets({ status: "disconnected", garmin_user_id: "g1" }, "g1"))
      .toEqual({ consents: true, workoutLinks: false });
  });

  it("clears everything for a different Garmin account", () => {
    expect(reconnectResets({ status: "needs_reconnect", garmin_user_id: "g1" }, "g2"))
      .toEqual({ consents: true, workoutLinks: true });
  });
});
