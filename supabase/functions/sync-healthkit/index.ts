import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { upsertActivities } from "../_shared/activity-upsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutIn {
  source_platform: string;
  source_platform_id: string;
  activity_type: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  calories_burned?: number;
  distance_km?: number;
  avg_heart_rate?: number;
  source_name?: string;
  device_name?: string;
}

interface DailyHRIn { date: string; avgBpm: number; }
interface DailyStepsIn { date: string; steps: number; }
interface SleepIn {
  date: string;
  durationMinutes: number;
  bedtime: string;
  wakeTime: string;
  source_platform: string;
}

interface SyncPayload {
  workouts?: WorkoutIn[];
  dailyHeartRate?: DailyHRIn[];
  dailySteps?: DailyStepsIn[];
  sleep?: SleepIn[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as SyncPayload;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let workoutResult: Awaited<ReturnType<typeof upsertActivities>> = { inserted: 0, skipped: 0, upgraded: 0, insertedRows: [] };
    let hrInserted = 0;
    let stepsInserted = 0;
    let sleepInserted = 0;

    // --- Workouts ---------------------------------------------------------
    if (body.workouts?.length) {
      // Drop our own Watch app's workouts — the WCSession direct path owns
      // those and carries richer payload. (Belt-and-braces: TS layer also
      // filters by bundle ID, but a stale client could still send them.)
      const eligible = body.workouts.filter(w => w.source_platform !== "apple_watch");
      const rows = eligible.map(w => ({
        user_id: user.id,
        activity_type: w.activity_type ?? "other",
        started_at: w.started_at,
        ended_at: w.ended_at,
        duration_seconds: w.duration_seconds,
        calories_burned: w.calories_burned ?? null,
        distance_km: w.distance_km ?? null,
        avg_heart_rate: w.avg_heart_rate ?? null,
        source_platform: w.source_platform,
        source_platform_id: w.source_platform_id,
      }));
      if (rows.length) {
        workoutResult = await upsertActivities(admin, rows);
      }
    }

    // --- Daily HR ---------------------------------------------------------
    // Daily averages aren't attributable to one wearable when multiple sync,
    // so store under source_platform = 'apple_health' with date-anchored
    // source_platform_id for natural per-day dedupe.
    if (body.dailyHeartRate?.length) {
      const rows = body.dailyHeartRate.map(d => ({
        user_id: user.id,
        metric_type: "heart_rate",
        value: d.avgBpm,
        unit: "bpm",
        recorded_at: `${d.date}T12:00:00Z`,
        source_platform: "apple_health",
        source_platform_id: `hr-${d.date}`,
      }));
      const { error } = await admin.from("health_metrics").upsert(rows, {
        onConflict: "user_id, source_platform, source_platform_id",
        ignoreDuplicates: false,
      });
      if (error) console.warn("[sync-healthkit] hr upsert error:", error.message);
      else hrInserted = rows.length;
    }

    // --- Daily steps ------------------------------------------------------
    if (body.dailySteps?.length) {
      const rows = body.dailySteps.map(d => ({
        user_id: user.id,
        metric_type: "steps",
        value: d.steps,
        unit: "count",
        recorded_at: `${d.date}T12:00:00Z`,
        source_platform: "apple_health",
        source_platform_id: `steps-${d.date}`,
      }));
      const { error } = await admin.from("health_metrics").upsert(rows, {
        onConflict: "user_id, source_platform, source_platform_id",
        ignoreDuplicates: false,
      });
      if (error) console.warn("[sync-healthkit] steps upsert error:", error.message);
      else stepsInserted = rows.length;
    }

    // --- Sleep ------------------------------------------------------------
    if (body.sleep?.length) {
      const rows = body.sleep.map(n => ({
        user_id: user.id,
        sleep_date: n.date,
        bedtime: n.bedtime,
        wake_time: n.wakeTime,
        duration_minutes: n.durationMinutes,
        source_platform: n.source_platform,
        source_platform_id: `sleep-${n.date}-${n.source_platform}`,
      }));
      const { error } = await admin.from("sleep_logs").upsert(rows, {
        onConflict: "user_id, source_platform, source_platform_id",
        ignoreDuplicates: false,
      });
      if (error) console.warn("[sync-healthkit] sleep upsert error:", error.message);
      else sleepInserted = rows.length;
    }

    return new Response(JSON.stringify({
      ok: true,
      workouts: workoutResult,
      heartRate: { inserted: hrInserted },
      steps: { inserted: stepsInserted },
      sleep: { inserted: sleepInserted },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[sync-healthkit] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
