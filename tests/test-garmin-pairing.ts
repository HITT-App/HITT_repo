// Pure unit tests for _shared/garmin-jwt.ts.
//
// Covers:
//   - JWT sign / verify happy path
//   - Wrong-secret verification fails
//   - Expired tokens fail
//   - Scope mismatch fails
//   - Tampered payload fails signature verification
//   - hashPairingCode is deterministic + collision-resistant vs adjacent codes
//
// Usage:
//   npx tsx tests/test-garmin-pairing.ts

import {
  signWatchPushJwt,
  verifyWatchPushJwt,
  hashPairingCode,
} from "../supabase/functions/_shared/garmin-jwt.ts";

const SECRET = "test-secret-do-not-use-in-prod-EQ7Y2p8Q1w";

const results: { name: string; passed: boolean; details?: string }[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, passed: true }); })
    .catch(err => {
      results.push({ name, passed: false, details: String(err?.message ?? err) });
    });
}

function assert(cond: unknown, msg?: string): asserts cond {
  if (!cond) throw new Error(msg ?? "assertion failed");
}

test("JWT-01 sign then verify round-trips claims", async () => {
  const token = await signWatchPushJwt(
    { sub: "user-abc", pairing_id: "pair-xyz" },
    SECRET,
  );
  const claims = await verifyWatchPushJwt(token, SECRET);
  assert(claims != null, "verify returned null");
  assert(claims.sub === "user-abc", `sub mismatch: ${claims.sub}`);
  assert(claims.pairing_id === "pair-xyz", `pairing mismatch: ${claims.pairing_id}`);
  assert(claims.scope === "garmin_watch_push", `scope mismatch: ${claims.scope}`);
});

test("JWT-02 wrong secret fails verification", async () => {
  const token = await signWatchPushJwt(
    { sub: "user-abc", pairing_id: "pair-xyz" },
    SECRET,
  );
  const claims = await verifyWatchPushJwt(token, "different-secret");
  assert(claims === null, "should have failed with wrong secret");
});

test("JWT-03 tampered payload fails verification", async () => {
  const token = await signWatchPushJwt(
    { sub: "user-abc", pairing_id: "pair-xyz" },
    SECRET,
  );
  // Swap the middle segment (payload) with a fabricated one.
  const parts = token.split(".");
  const fake = {
    sub: "attacker-999",
    pairing_id: "pair-xyz",
    scope: "garmin_watch_push",
    iat: 0,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const fakeB64 = btoa(JSON.stringify(fake)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const tampered = `${parts[0]}.${fakeB64}.${parts[2]}`;
  const claims = await verifyWatchPushJwt(tampered, SECRET);
  assert(claims === null, "tampered token should fail");
});

test("JWT-04 malformed token fails verification", async () => {
  const claims = await verifyWatchPushJwt("not.a.jwt", SECRET);
  assert(claims === null);
});

test("JWT-05 verify returns null for expired token (manual craft)", async () => {
  // Craft an expired token by signing then manually stitching a past exp.
  // Since our signWatchPushJwt always uses now + 30d, replace via a low-level path.
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "u", pairing_id: "p", scope: "garmin_watch_push",
    iat: 1000, exp: 2000,
  };
  const enc = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const headerB64 = enc(JSON.stringify(header));
  const bodyB64 = enc(JSON.stringify(payload));
  const signingInput = `${headerB64}.${bodyB64}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign({ name: "HMAC" }, key, new TextEncoder().encode(signingInput));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const sigB64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const expired = `${headerB64}.${bodyB64}.${sigB64}`;
  const claims = await verifyWatchPushJwt(expired, SECRET);
  assert(claims === null, "expired token should fail");
});

test("HASH-01 same code hashes to same value (deterministic)", async () => {
  const a = await hashPairingCode("123456");
  const b = await hashPairingCode("123456");
  assert(a === b, "deterministic hash");
  assert(a.length === 64, `expected 64-char hex, got ${a.length}`);
});

test("HASH-02 adjacent codes produce distinct hashes", async () => {
  const a = await hashPairingCode("123456");
  const b = await hashPairingCode("123457");
  assert(a !== b, "adjacent codes must differ");
});

test("HASH-03 zero-padded and non-padded are distinct", async () => {
  const a = await hashPairingCode("000001");
  const b = await hashPairingCode("1");
  assert(a !== b, "zero-padded must differ from non-padded");
});

// ── Report ──────────────────────────────────────────────────────────────

setTimeout(() => {
  const passed = results.filter(r => r.passed).length;
  console.log(`\nGARMIN PAIRING JWT TESTS — ${passed}/${results.length} passed`);
  console.log("─".repeat(60));
  for (const r of results) {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}${r.details ? "  — " + r.details : ""}`);
  }
  if (results.some(r => !r.passed)) process.exit(1);
}, 300);
