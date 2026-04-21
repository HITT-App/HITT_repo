import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const batch = body?.batch === true;

    if (batch) {
      const auth = req.headers.get("Authorization") ?? "";
      if (!auth.includes(SUPABASE_SERVICE_ROLE_KEY)) {
        return json({ error: "Service role required for batch mode" }, 403);
      }

      const weekAgoISO = new Date(Date.now() - 7 * 86400000).toISOString();
      const [workouts, meals, checkins] = await Promise.all([
        admin.from("scheduled_workouts").select("user_id").gte("completed_at", weekAgoISO),
        admin.from("meal_logs").select("user_id").gte("logged_at", weekAgoISO),
        admin.from("daily_checkins").select("user_id").gte("created_at", weekAgoISO),
      ]);

      const activeUsers = new Set<string>();
      for (const row of workouts.data ?? []) activeUsers.add(row.user_id);
      for (const row of meals.data ?? []) activeUsers.add(row.user_id);
      for (const row of checkins.data ?? []) activeUsers.add(row.user_id);

      const results: Array<{ user_id: string; score: number }> = [];
      for (const userId of activeUsers) {
        try {
          const { score } = await computeAndStore(admin, userId);
          results.push({ user_id: userId, score });
        } catch (err) {
          console.error(`compute-hiit-score failed for ${userId}:`, err);
        }
      }

      return json({ processed: results.length, results });
    }

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const result = await computeAndStore(admin, user.id);
    return json(result);
  } catch (err) {
    console.error("compute-hiit-score error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function computeAndStore(admin: SupabaseClient, userId: string) {
  const now = Date.now();
  const weekAgoISO = new Date(now - 7 * 86400000).toISOString();
  const weekAgoDate = new Date(now - 7 * 86400000).toISOString().split("T")[0];

  const [workoutsRes, streakRes, goalRes, mealsRes, sleepRes] = await Promise.all([
    admin.from("scheduled_workouts")
      .select("duration_minutes, completed_at")
      .eq("user_id", userId).eq("status", "completed").gte("completed_at", weekAgoISO),
    admin.from("user_streaks")
      .select("current_streak").eq("user_id", userId).maybeSingle(),
    admin.from("nutrition_goals")
      .select("daily_protein_grams").eq("user_id", userId).maybeSingle(),
    admin.from("meal_logs")
      .select("protein_grams, logged_at").eq("user_id", userId).gte("logged_at", weekAgoISO),
    admin.from("sleep_logs")
      .select("duration_minutes, sleep_date").eq("user_id", userId).gte("sleep_date", weekAgoDate),
  ]);

  const workouts = workoutsRes.data ?? [];
  const workoutCount = workouts.length;
  const avgDuration = workoutCount > 0
    ? workouts.reduce((a, w) => a + (w.duration_minutes ?? 0), 0) / workoutCount
    : 0;

  const streakDays = streakRes.data?.current_streak ?? 0;

  const proteinTarget = goalRes.data?.daily_protein_grams ?? 50;
  const proteinByDay = new Map<string, number>();
  for (const m of mealsRes.data ?? []) {
    const day = new Date(m.logged_at).toISOString().split("T")[0];
    proteinByDay.set(day, (proteinByDay.get(day) ?? 0) + Number(m.protein_grams ?? 0));
  }
  const nutritionDaysHit = Array.from(proteinByDay.values())
    .filter((p) => p >= proteinTarget * 0.9).length;

  const sleepDaysGood = (sleepRes.data ?? [])
    .filter((s) => (s.duration_minutes ?? 0) >= 420).length;

  const intensityRatio = workoutCount > 0 ? Math.min(avgDuration / 20, 1) : 0;

  const workoutsScore = Math.min(workoutCount * 3, 15);
  const streakScore = Math.min(streakDays, 5);
  const nutritionScore = Math.min(nutritionDaysHit * 2, 10);
  const sleepScore = Math.min(sleepDaysGood * 2, 10);
  const intensityScore = Math.round(intensityRatio * 10);

  const score = Math.max(0, Math.min(100,
    50 + workoutsScore + streakScore + nutritionScore + sleepScore + intensityScore
  ));

  const components = {
    workouts: workoutsScore,
    streak: streakScore,
    nutrition: nutritionScore,
    sleep: sleepScore,
    intensity: intensityScore,
    inputs: {
      workoutCount,
      streakDays,
      nutritionDaysHit,
      sleepDaysGood,
      avgDurationMinutes: Math.round(avgDuration),
    },
  };

  const { error: insertError } = await admin.from("hiit_score_history").insert({
    user_id: userId,
    score,
    components,
  });
  if (insertError) throw insertError;

  return { score, components };
}
