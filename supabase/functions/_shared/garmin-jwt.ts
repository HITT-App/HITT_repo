// Purpose-built JWT for the Garmin CIQ watch's direct push path.
//
// Scoped to (user_id, pairing_id) and signed with GARMIN_PAIRING_HMAC_SECRET
// — a separate secret from Supabase's JWT secret. A leaked watch token
// therefore CAN'T authenticate against the general Supabase Auth
// infrastructure; the only endpoint that accepts it is
// push-garmin-watch-workout, which routes writes exclusively into
// activity_logs via the service-role client.
//
// The pairing_id embedded in the JWT is checked against garmin_pairings on
// every push — if the phone marks the pairing revoked_at, subsequent pushes
// fail. This gives the user a way to nuke a lost watch immediately without
// waiting for the JWT to expire.
//
// Lifetime: 30 days. Refresh via re-pair (no refresh-token flow — Garmin
// devices need re-pair on OS reinstall anyway, and a longer window means
// less chance of a stale watch getting locked out mid-workout).

const ALG = "HS256";
const TYPE = "JWT";
const JWT_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

export interface WatchPushClaims {
  sub: string;
  pairing_id: string;
  scope: "garmin_watch_push";
  iat: number;
  exp: number;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signWatchPushJwt(
  claims: { sub: string; pairing_id: string },
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: WatchPushClaims = {
    sub: claims.sub,
    pairing_id: claims.pairing_id,
    scope: "garmin_watch_push",
    iat: now,
    exp: now + JWT_LIFETIME_SECONDS,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: ALG, typ: TYPE }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign(
    { name: "HMAC" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifyWatchPushJwt(token: string, secret: string): Promise<WatchPushClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify(
      { name: "HMAC" },
      key,
      base64UrlDecode(sigB64),
      new TextEncoder().encode(`${headerB64}.${bodyB64}`),
    );
    if (!ok) return null;
    const body = JSON.parse(new TextDecoder().decode(base64UrlDecode(bodyB64))) as WatchPushClaims;
    if (body.scope !== "garmin_watch_push") return null;
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    if (!body.sub || !body.pairing_id) return null;
    return body;
  } catch {
    return null;
  }
}

// SHA-256 the plaintext 6-digit code before storing. Comparison is O(1)
// — an attacker with a DB dump can still brute-force the 10^6 code space
// but only within the code's 5-min TTL window.
export async function hashPairingCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
