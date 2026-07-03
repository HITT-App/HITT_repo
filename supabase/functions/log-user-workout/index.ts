import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { upsertActivities } from "../_shared/activity-upsert.ts";

// Client-callable ingest for user-triggered workout logs (manual "Log
// Workout" button, Triathlon completion, GymTimer session, etc). Routes
// every write through the shared upsertActivities helper so the 3-layer
// dedupe fires — a wearable-arrived duplicate of the same workout will
// then upgrade this row via source-priority (hitt_phone = 20, so any
// hitt_garmin_watch / apple_watch / garmin / fitbit / whoop / oura row
// wins).
//
// Auth: standard Supabase user session.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  activity_type: string;
  duration_seconds: number;
  started_at?: string;      // ISO — defaults to now - duration
  ended_at?: string;
  distance_km?: number;
  calories_burned?: number;
  avg_heart_rate?: number;
  total_volume_kg?: number;
  notes?: string;
  status?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.activity_type || !body.duration_seconds) {
      return new Response(JSON.stringify({ error: "activity_type and duration_seconds required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const startedAt = body.started_at
      ?? new Date(now.getTime() - body.duration_seconds * 1000).toISOString();
    const endedAt = body.ended_at ?? now.toISOString();

    const result = await upsertActivities(admin, [{
      user_id: user.id,
      activity_type: body.activity_type,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: body.duration_seconds,
      calories_burned: body.calories_burned ?? null,
      avg_heart_rate: body.avg_heart_rate ?? null,
      distance_km: body.distance_km ?? null,
      total_volume_kg: body.total_volume_kg ?? null,
      notes: body.notes,
      status: body.status ?? "completed",
      source_platform: "hitt_phone",
      source_platform_id: `phone-${user.id}-${new Date(startedAt).getTime()}-${body.duration_seconds}`,
    } as any]);

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[log-user-workout] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
