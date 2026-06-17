import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WatchWorkoutPayload {
  workoutId: string;
  workoutName: string;
  activityType?: string;
  durationSeconds: number;
  calories: number;
  averageHeartRate: number;
  startedAt?: string;
  endedAt?: string;
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as WatchWorkoutPayload;
    if (!body.workoutId || !body.durationSeconds) {
      return new Response(JSON.stringify({ error: "workoutId and durationSeconds are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();
    const endedAt = body.endedAt ?? now;
    const startedAt = body.startedAt ?? new Date(Date.now() - body.durationSeconds * 1000).toISOString();

    const { error } = await admin.from("activity_logs").insert({
      user_id: user.id,
      activity_type: body.activityType ?? "hiit",
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: body.durationSeconds,
      calories_burned: body.calories || null,
      avg_heart_rate: body.averageHeartRate || null,
      status: "completed",
      source_platform: "apple_watch",
      source_platform_id: body.workoutId,
    }).onConflict("user_id, source_platform, source_platform_id").ignore();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
