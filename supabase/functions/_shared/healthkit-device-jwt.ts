// Purpose-built JWT for the iPhone's background HealthKit sync path.
//
// Scoped to a single user_id and signed with HEALTHKIT_DEVICE_HMAC_SECRET
// — a separate secret from Supabase's JWT and from the Garmin CIQ HMAC.
// A leaked device token therefore CAN'T authenticate against the general
// Supabase Auth infrastructure; the only endpoint that accepts it is
// sync-healthkit-background, which routes writes exclusively into
// activity_logs via the service-role client.
//
// Lifetime: 90 days. iOS holds the token in the Keychain across launches
// and background wakes. The client re-mints on foreground when the token
// has <7 days remaining. Rotating this secret invalidates every device
// immediately — do it if a token is suspected to have leaked.

const ALG = "HS256";
const TYPE = "JWT";
const JWT_LIFETIME_SECONDS = 90 * 24 * 60 * 60;

export interface HealthKitDeviceClaims {
  sub: string;                       // user_id
  scope: "healthkit_device_sync";
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

export async function signHealthKitDeviceJwt(userId: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: HealthKitDeviceClaims = {
    sub: userId,
    scope: "healthkit_device_sync",
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

export async function verifyHealthKitDeviceJwt(
  token: string,
  secret: string,
): Promise<HealthKitDeviceClaims | null> {
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
    const body = JSON.parse(new TextDecoder().decode(base64UrlDecode(bodyB64))) as HealthKitDeviceClaims;
    if (body.scope !== "healthkit_device_sync") return null;
    if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
    if (!body.sub) return null;
    return body;
  } catch {
    return null;
  }
}
