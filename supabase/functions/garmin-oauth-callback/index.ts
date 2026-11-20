// Garmin redirects the browser here after consent. verify_jwt is off because
// there is no session; the single-use state ties the request to a HIIT user.
// Nothing is linked until the same user redeems the result in garmin-oauth-finish.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { garminEnv } from "../_shared/garmin-connection.ts";
import { encryptToken, sha256Hex } from "../_shared/garmin-crypto.ts";
import { adminClient } from "../_shared/garmin-http.ts";
import {
  buildReturnUrl,
  callbackUrl,
  exchangeCode,
  fetchGarminUser,
  type GarminTokenResponse,
  randomUrlSafe,
  tokenExpiries,
} from "../_shared/garmin-oauth.ts";

const RESULT_TTL_MS = 10 * 60 * 1000;

function backToApp(status: string, result?: string): Response {
  return new Response(null, { status: 302, headers: { Location: buildReturnUrl(status, result) } });
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state) return backToApp("failed");

    const admin = adminClient();
    const { data: claimed } = await admin
      .from("garmin_oauth_states")
      .update({ used_at: new Date().toISOString() })
      .eq("state", state)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("user_id, code_verifier");
    if (!claimed?.length) return backToApp("failed");
    if (!code) return backToApp("declined");

    const { clientId, clientSecret, tokenKey } = garminEnv();
    const tokenRes = await exchangeCode({
      clientId,
      clientSecret,
      code,
      verifier: claimed[0].code_verifier,
      redirectUri: callbackUrl(Deno.env.get("SUPABASE_URL")!),
    });
    if (!tokenRes.ok) {
      console.error("[garmin-oauth-callback] token exchange failed:", tokenRes.status);
      return backToApp("failed");
    }
    const token = await tokenRes.json() as GarminTokenResponse;

    const [idRes, permissionsRes] = await Promise.all([
      fetchGarminUser(token.access_token, "id"),
      fetchGarminUser(token.access_token, "permissions"),
    ]);
    if (!idRes.ok || !permissionsRes.ok) {
      console.error("[garmin-oauth-callback] user lookup failed:", idRes.status, permissionsRes.status);
      return backToApp("failed");
    }
    const { userId: garminUserId } = await idRes.json() as { userId: string };
    const { permissions } = await permissionsRes.json() as { permissions: string[] };

    const result = randomUrlSafe(32);
    const { error } = await admin.from("garmin_oauth_results").insert({
      result_hash: await sha256Hex(result),
      user_id: claimed[0].user_id,
      garmin_user_id: garminUserId,
      permissions: permissions ?? [],
      access_token_enc: await encryptToken(token.access_token, tokenKey),
      refresh_token_enc: await encryptToken(token.refresh_token, tokenKey),
      ...tokenExpiries(token),
      expires_at: new Date(Date.now() + RESULT_TTL_MS).toISOString(),
    });
    if (error) throw new Error(error.message);

    return backToApp("pending", result);
  } catch (e) {
    console.error("[garmin-oauth-callback]", (e as Error).message);
    return backToApp("failed");
  }
});
