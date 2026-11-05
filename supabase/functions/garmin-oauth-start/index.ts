// Starts Garmin's consent flow for the signed-in user and returns the URL to open.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { alertConnectionCount, garminEnabledFor, garminEnv } from "../_shared/garmin-connection.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";
import {
  buildAuthorizeUrl,
  callbackUrl,
  codeChallenge,
  randomUrlSafe,
  STARTER_CONNECTION_CAP,
} from "../_shared/garmin-oauth.ts";

const STATE_TTL_MS = 10 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = adminClient();
    if (!await garminEnabledFor(admin, user.id)) return json({ error: "not_available" }, 403);

    const body = await req.json().catch(() => ({})) as { notice_accepted?: boolean };
    if (body.notice_accepted !== true) return json({ error: "notice_required" }, 400);

    const { count, error: countError } = await admin
      .from("garmin_connections")
      .select("user_id", { count: "exact", head: true })
      .neq("status", "disconnected");
    if (countError) throw new Error(countError.message);
    await alertConnectionCount(count ?? 0);
    if ((count ?? 0) >= STARTER_CONNECTION_CAP) return json({ error: "cap_reached" }, 409);

    const nowIso = new Date().toISOString();
    await admin.from("garmin_oauth_states").delete().lt("expires_at", nowIso);
    await admin.from("garmin_oauth_results").delete().lt("expires_at", nowIso);

    const state = randomUrlSafe(32);
    const verifier = randomUrlSafe(48);
    const { error } = await admin.from("garmin_oauth_states").insert({
      state,
      user_id: user.id,
      code_verifier: verifier,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    });
    if (error) throw new Error(error.message);

    return json({
      url: buildAuthorizeUrl({
        clientId: garminEnv().clientId,
        challenge: await codeChallenge(verifier),
        state,
        redirectUri: callbackUrl(Deno.env.get("SUPABASE_URL")!),
      }),
    });
  } catch (e) {
    console.error("[garmin-oauth-start]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
