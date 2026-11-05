export const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";
export const GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
export const GARMIN_API_BASE = "https://apis.garmin.com/partner-gateway/rest";
export const APP_RETURN_URL = "hiitfitness://garmin-connected";
export const STARTER_CONNECTION_CAP = 1000;

// Garmin advises refreshing at least 600 seconds early.
export const ACCESS_TOKEN_MARGIN_MS = 600 * 1000;

export type GarminTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
};

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomUrlSafe(byteLength = 48): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function buildAuthorizeUrl(p: {
  clientId: string;
  challenge: string;
  state: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: p.clientId,
    code_challenge: p.challenge,
    code_challenge_method: "S256",
    redirect_uri: p.redirectUri,
    state: p.state,
  });
  return `${GARMIN_AUTHORIZE_URL}?${params}`;
}

// useAuth hands any hiitfitness:// URL containing "code=" to Supabase auth,
// so a return URL must never include that text.
export function buildReturnUrl(status: string, result?: string): string {
  const params = new URLSearchParams({ status });
  if (result) params.set("result", result);
  return `${APP_RETURN_URL}?${params}`;
}

export function callbackUrl(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1/garmin-oauth-callback`;
}

export function tokenExpiries(token: GarminTokenResponse, now = Date.now()) {
  return {
    access_expires_at: new Date(now + token.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + token.refresh_token_expires_in * 1000).toISOString(),
  };
}

async function postToken(body: Record<string, string>): Promise<Response> {
  return await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
}

export function exchangeCode(p: {
  clientId: string;
  clientSecret: string;
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<Response> {
  return postToken({
    grant_type: "authorization_code",
    client_id: p.clientId,
    client_secret: p.clientSecret,
    code: p.code,
    code_verifier: p.verifier,
    redirect_uri: p.redirectUri,
  });
}

export function refreshGrant(p: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<Response> {
  return postToken({
    grant_type: "refresh_token",
    client_id: p.clientId,
    client_secret: p.clientSecret,
    refresh_token: p.refreshToken,
  });
}

export function fetchGarminUser(accessToken: string, path: "id" | "permissions" | "registration", method = "GET") {
  return fetch(`${GARMIN_API_BASE}/user/${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type FinishCheck =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "used" | "wrong_user" };

// The result token reaches only the browser that completed Garmin's consent,
// and only the HIIT user who started the flow can redeem it. Together these stop
// someone sending a victim their link to attach the victim's Garmin to their account.
export function checkFinish(
  row: { user_id: string; expires_at: string; used_at: string | null } | null,
  jwtUserId: string,
  now = Date.now(),
): FinishCheck {
  if (!row) return { ok: false, reason: "not_found" };
  if (row.user_id !== jwtUserId) return { ok: false, reason: "wrong_user" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() <= now) return { ok: false, reason: "expired" };
  return { ok: true };
}
