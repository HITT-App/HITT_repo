import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken, encryptToken } from "./garmin-crypto.ts";
import {
  ACCESS_TOKEN_MARGIN_MS,
  fetchGarminUser,
  type GarminTokenResponse,
  refreshGrant,
  tokenExpiries,
} from "./garmin-oauth.ts";

const REFRESH_LOCK_MS = 30 * 1000;

export class GarminTokenDead extends Error {}
export class GarminRetryLater extends Error {}

export function garminEnv() {
  const clientId = Deno.env.get("GARMIN_CLIENT_ID");
  const clientSecret = Deno.env.get("GARMIN_CLIENT_SECRET");
  const tokenKey = Deno.env.get("GARMIN_TOKEN_KEY");
  if (!clientId || !clientSecret || !tokenKey) throw new Error("Garmin secrets are not configured");
  return { clientId, clientSecret, tokenKey };
}

// Fails closed: a missing or unreadable setting means off.
export async function garminEnabledFor(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data: flag } = await admin.from("app_settings").select("value").eq("key", "ff_garmin_cloud").maybeSingle();
  if (flag?.value === "on") return true;
  const { data: tester } = await admin.from("garmin_testers").select("user_id").eq("user_id", userId).maybeSingle();
  return !!tester;
}

export async function getValidAccessToken(admin: SupabaseClient, userId: string): Promise<string> {
  const { clientId, clientSecret, tokenKey } = garminEnv();
  const { data: row } = await admin.from("garmin_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!row) throw new GarminTokenDead("No Garmin tokens stored");

  if (new Date(row.access_expires_at).getTime() - Date.now() > ACCESS_TOKEN_MARGIN_MS) {
    return await decryptToken(row.access_token_enc, tokenKey);
  }

  // Each refresh rotates the refresh token, so two at once could strand the older one.
  const now = new Date().toISOString();
  const { data: locked } = await admin
    .from("garmin_tokens")
    .update({ refresh_lock_until: new Date(Date.now() + REFRESH_LOCK_MS).toISOString() })
    .eq("user_id", userId)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${now}`)
    .select("refresh_token_enc");
  if (!locked?.length) throw new GarminRetryLater("Another refresh is in progress");

  const refreshToken = await decryptToken(locked[0].refresh_token_enc, tokenKey);
  const res = await refreshGrant({ clientId, clientSecret, refreshToken });

  if (res.status === 400 || res.status === 401) {
    await admin.from("garmin_tokens").update({ refresh_lock_until: null }).eq("user_id", userId);
    await admin.from("garmin_connections").update({ status: "needs_reconnect" }).eq("user_id", userId);
    throw new GarminTokenDead(`Refresh rejected: ${res.status}`);
  }
  if (!res.ok) {
    await admin.from("garmin_tokens").update({ refresh_lock_until: null }).eq("user_id", userId);
    throw new GarminRetryLater(`Refresh failed: ${res.status}`);
  }

  const token = await res.json() as GarminTokenResponse;
  const { error } = await admin.from("garmin_tokens").update({
    access_token_enc: await encryptToken(token.access_token, tokenKey),
    refresh_token_enc: await encryptToken(token.refresh_token, tokenKey),
    ...tokenExpiries(token),
    refresh_lock_until: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (error) throw new GarminRetryLater(`Could not save refreshed token: ${error.message}`);
  return token.access_token;
}

export type RevokeOutcome = "none" | "revoked" | "token_dead";

// Garmin requires this call for both Disconnect and Delete My Account. Tokens are
// kept when Garmin can't be reached, so the caller can retry. Throws GarminRetryLater.
export async function revokeGarminRegistration(admin: SupabaseClient, userId: string): Promise<RevokeOutcome> {
  const { data: conn } = await admin
    .from("garmin_connections")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conn || conn.status === "disconnected") return "none";

  let outcome: RevokeOutcome = "revoked";
  try {
    const accessToken = await getValidAccessToken(admin, userId);
    const res = await fetchGarminUser(accessToken, "registration", "DELETE");
    if (res.status === 401) outcome = "token_dead";
    else if (!res.ok) throw new GarminRetryLater(`Garmin returned ${res.status}`);
  } catch (e) {
    if (!(e instanceof GarminTokenDead)) throw e;
    outcome = "token_dead";
  }

  await admin.from("garmin_tokens").delete().eq("user_id", userId);
  await admin.from("garmin_connections").update({
    status: "disconnected",
    disconnected_at: new Date().toISOString(),
    disconnect_reason: "user",
  }).eq("user_id", userId);
  return outcome;
}

// Rows that started on another source keep their history and lose only the Garmin values.
export async function deleteImportedGarminData(admin: SupabaseClient, userId: string): Promise<void> {
  const { error: deleteError } = await admin
    .from("activity_logs")
    .delete()
    .eq("user_id", userId)
    .eq("source_platform", "garmin_api");
  if (deleteError) throw new Error(deleteError.message);

  const { error: clearError } = await admin
    .from("activity_logs")
    .update({ garmin_activity_id: null, garmin_device_name: null })
    .eq("user_id", userId)
    .not("garmin_activity_id", "is", null);
  if (clearError) throw new Error(clearError.message);
}
