// The app calls this with the result from the return URL to activate the link.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sha256Hex } from "../_shared/garmin-crypto.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";
import { checkFinish } from "../_shared/garmin-oauth.ts";

const UNIQUE_VIOLATION = "23505";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as { result?: string };
    if (!body.result) return json({ error: "not_found" }, 400);

    const admin = adminClient();
    const resultHash = await sha256Hex(body.result);
    const { data: row } = await admin
      .from("garmin_oauth_results")
      .select("*")
      .eq("result_hash", resultHash)
      .maybeSingle();

    const check = checkFinish(row, user.id);
    if (!check.ok) return json({ error: check.reason }, check.reason === "wrong_user" ? 403 : 400);

    const { data: claimed } = await admin
      .from("garmin_oauth_results")
      .update({ used_at: new Date().toISOString() })
      .eq("result_hash", resultHash)
      .is("used_at", null)
      .select("result_hash");
    if (!claimed?.length) return json({ error: "used" }, 400);

    const { error: linkError } = await admin.from("garmin_connections").upsert({
      user_id: user.id,
      garmin_user_id: row!.garmin_user_id,
      permissions: row!.permissions,
      status: "active",
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      disconnect_reason: null,
    });
    if (linkError?.code === UNIQUE_VIOLATION) {
      await admin.from("garmin_oauth_results").delete().eq("result_hash", resultHash);
      return json({ error: "already_linked" }, 409);
    }
    if (linkError) throw new Error(linkError.message);

    const { error: tokenError } = await admin.from("garmin_tokens").upsert({
      user_id: user.id,
      access_token_enc: row!.access_token_enc,
      refresh_token_enc: row!.refresh_token_enc,
      access_expires_at: row!.access_expires_at,
      refresh_expires_at: row!.refresh_expires_at,
      refresh_lock_until: null,
      updated_at: new Date().toISOString(),
    });
    if (tokenError) throw new Error(tokenError.message);

    await admin.from("garmin_oauth_results").delete().eq("result_hash", resultHash);
    return json({ status: "active", permissions: row!.permissions });
  } catch (e) {
    console.error("[garmin-oauth-finish]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
