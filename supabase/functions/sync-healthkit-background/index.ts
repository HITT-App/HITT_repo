import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyHealthKitDeviceJwt } from "../_shared/healthkit-device-jwt.ts";
import { upsertActivities } from "../_shared/activity-upsert.ts";

// Called by the iPhone's native background HealthKit observer when iOS
// wakes the app for a new workout sample (Apple Watch, Fitbit, Whoop,
// Oura, Garmin-via-HK, etc.). The app is running headless with ~30s of
// runtime — we need to be fast.
//
// Auth: 90-day device JWT in Authorization header (see mint-healthkit-
// device-token). We do NOT accept a Supabase user session here because
// background wakes have no session context.
//
// Payload → shared upsertActivities helper (same 3-layer dedupe every
// other ingest path uses). After the insert, we fire notify-user for
// each genuinely-new row so the user gets a lock-screen banner nudging
// them to share.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

interface WorkoutPayload {
  workout_type: string;
  duration_seconds: number;
  start_time: string;
  end_time?: string;
  calories?: number;
  hr_avg?: number;
  hr_max?: number;
  distance_m?: number;
  source_platform: string;   // "apple_watch", "garmin", "fitbit", "whoop", "oura", "apple_health_native", …
  source_platform_id?: string;
}

interface RequestBody {
  workouts: WorkoutPayload[];
}

function friendlyActivityName(type: string | null | undefined): string {
  const map: Record<string, string> = {
    running: "run", jogging: "run", walking: "walk",
    cycling: "ride", swimming: "swim", hiit: "HIIT",
    strength: "strength session", yoga: "yoga",
    hiking: "hike", rowing: "row",
  };
  const key = (type ?? "").toLowerCase();
  return map[key] ?? "workout";
}

function friendlySourceLabel(source: string): string {
  const map: Record<string, string> = {
    apple_watch: "Apple Watch",
    garmin: "Garmin",
    fitbit: "Fitbit",
    whoop: "Whoop",
    oura: "Oura",
    polar: "Polar",
    coros: "Coros",
    wahoo: "Wahoo",
    apple_health_native: "your watch",
  };
  return map[source] ?? "your watch";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("HEALTHKIT_DEVICE_HMAC_SECRET");
    if (!secret) {
      console.error("[sync-healthkit-background] secret not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claims = await verifyHealthKitDeviceJwt(token, secret);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    if (!Array.isArray(body.workouts) || body.workouts.length === 0) {
      // Empty is fine — iOS may wake us with nothing new.
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = body.workouts.map((w) => {
      const endedAt = w.end_time
        ?? new Date(new Date(w.start_time).getTime() + w.duration_seconds * 1000).toISOString();
      return {
        user_id: claims.sub,
        activity_type: w.workout_type,
        started_at: w.start_time,
        ended_at: endedAt,
        duration_seconds: w.duration_seconds,
        calories_burned: w.calories ?? null,
        avg_heart_rate: w.hr_avg ?? null,
        distance_km: w.distance_m != null ? w.distance_m / 1000 : null,
        source_platform: w.source_platform,
        source_platform_id: w.source_platform_id
          ?? `${claims.sub}-${new Date(w.start_time).getTime()}-${w.duration_seconds}`,
      };
    });

    const result = await upsertActivities(admin, rows);

    // Fire a lock-screen push for each genuinely-new activity — this
    // is what makes the whole "workout done → phone buzzes → tap to
    // share" flow feel like magic. Non-blocking: notify failures never
    // fail the ingest.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    await Promise.all(
      (result.insertedRows ?? []).map(async (row) => {
        try {
          const mins = Math.max(1, Math.round(row.duration_seconds / 60));
          const cals = row.calories_burned;
          const activityName = friendlyActivityName(row.activity_type);
          const source = friendlySourceLabel(row.source_platform);
          const bodyParts = [`${mins}-min ${activityName}`];
          if (cals && cals > 0) bodyParts.push(`${cals} kcal`);
          bodyParts.push("Tap to share it.");
          await fetch(`${supabaseUrl}/functions/v1/notify-user`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: claims.sub,
              category: "workout",
              title: `Workout logged from ${source}`,
              body: bodyParts.join(" · "),
              url: `/activity/${row.id}`,
            }),
          });
        } catch (notifyErr) {
          console.error("[sync-healthkit-background] notify-user failed:", notifyErr);
        }
      }),
    );

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-healthkit-background] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
