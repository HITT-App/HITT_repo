// Watch push endpoint. Called by the HITT CIQ app immediately after
// session.save() on the watch. Non-blocking on the watch side — if we're
// down or unreachable, the Fit-file path via Garmin Connect → Apple Health
// still catches the workout later.
//
// Auth: Bearer token in Authorization header. Token is minted by
// redeem-garmin-pairing (see _shared/garmin-jwt.ts). Contains user_id and
// pairing_id; we cross-check pairing_id against garmin_pairings.revoked_at
// on every push so the phone can nuke a lost watch instantly.
//
// Feature flag: `ff_garmin_watch_direct_push` in the `app_settings` table.
// If off, we return 503 — watch retries later. Lets us dark-launch and
// roll back without a CIQ store release.
//
// Payload → shared upsertActivities helper (same 3-layer dedupe every
// other ingest path uses). source_platform = 'hitt_garmin_watch' so the
// SOURCE_PRIORITY winner-selection promotes this row over any
// HealthKit-mediated 'garmin' row for the same workout.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWatchPushJwt } from "../_shared/garmin-jwt.ts";
import { upsertActivities } from "../_shared/activity-upsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

interface PushPayload {
  workout_type: string;         // "running" / "cycling" / "strength" / etc — normalised server-side
  duration_seconds: number;
  start_time: string;           // ISO
  end_time?: string;            // ISO (optional; derived if missing)
  calories?: number;
  hr_avg?: number;
  hr_max?: number;
  distance_m?: number;
  external_id?: string;         // watch-generated activity id; falls back to a hash-of-payload
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GARMIN_PAIRING_HMAC_SECRET = Deno.env.get("GARMIN_PAIRING_HMAC_SECRET");
    if (!GARMIN_PAIRING_HMAC_SECRET) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bearer token → verify.
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!bearer) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const claims = await verifyWatchPushJwt(bearer, GARMIN_PAIRING_HMAC_SECRET);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Feature flag — check app_settings.ff_garmin_watch_direct_push. Any
    // failure to read defaults to "on" so a bad settings row doesn't
    // silently break all pushes.
    const { data: flagRow } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "ff_garmin_watch_direct_push")
      .maybeSingle();
    if (flagRow?.value === "off" || flagRow?.value === false) {
      return new Response(JSON.stringify({ error: "Endpoint temporarily disabled" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm the pairing hasn't been revoked.
    const { data: pairing } = await admin
      .from("garmin_pairings")
      .select("id, revoked_at")
      .eq("id", claims.pairing_id)
      .maybeSingle();
    if (!pairing || pairing.revoked_at) {
      return new Response(JSON.stringify({ error: "Pairing revoked" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as PushPayload;
    if (!body.workout_type || !body.start_time || !body.duration_seconds) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fingerprint fallback if the watch didn't send an external_id.
    const externalId = body.external_id
      ?? `${claims.pairing_id}-${new Date(body.start_time).getTime()}-${body.duration_seconds}`;

    const endedAt = body.end_time
      ?? new Date(new Date(body.start_time).getTime() + body.duration_seconds * 1000).toISOString();

    const result = await upsertActivities(admin, [{
      user_id: claims.sub,
      activity_type: body.workout_type,
      started_at: body.start_time,
      ended_at: endedAt,
      duration_seconds: body.duration_seconds,
      calories_burned: body.calories ?? null,
      avg_heart_rate: body.hr_avg ?? null,
      distance_km: body.distance_m != null ? body.distance_m / 1000 : null,
      source_platform: "hitt_garmin_watch",
      source_platform_id: externalId,
    }]);

    // Update last_seen_at on the pairing for the Settings "last activity" display.
    await admin
      .from("garmin_pairings")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", pairing.id);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[push-garmin-watch-workout] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
