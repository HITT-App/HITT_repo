import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const todayUTC = new Date().toISOString().split("T")[0];

    // Check if we already generated an insight today
    const { data: existing } = await admin
      .from("daily_insights")
      .select("insight_text, insight_type, generated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.generated_at === todayUTC) {
      return json({ insight: existing.insight_text, type: existing.insight_type, fresh: false });
    }

    // ── Rule-based checks (no AI cost) ───────────────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { count: scheduleCount },
      { count: sleepCount },
      { count: activityCount },
      { count: workoutCount },
      { count: mealCount },
    ] = await Promise.all([
      admin.from("scheduled_workouts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("sleep_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("activity_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("workout_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("meal_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const hasAnyActivity = (activityCount ?? 0) > 0 || (workoutCount ?? 0) > 0;

    let ruleInsight: string | null = null;

    if (!hasAnyActivity) {
      ruleInsight = "Log your first workout or activity to start tracking your progress — every journey starts with one session.";
    } else if ((scheduleCount ?? 0) === 0) {
      ruleInsight = "You haven't set up a training schedule yet — head to Schedule to plan your week and stay consistent.";
    } else if ((sleepCount ?? 0) === 0) {
      ruleInsight = "You haven't tracked any sleep yet — recovery is half the work, and the Sleep section can show you the patterns.";
    } else if ((mealCount ?? 0) === 0) {
      ruleInsight = "You haven't logged any meals yet — tracking nutrition alongside your workouts gives you the full picture.";
    }

    if (ruleInsight) {
      await admin.from("daily_insights").upsert({
        user_id: user.id,
        insight_text: ruleInsight,
        insight_type: "rule",
        generated_at: todayUTC,
      }, { onConflict: "user_id" });
      return json({ insight: ruleInsight, type: "rule", fresh: true });
    }

    // ── AI insight — user has meaningful data ────────────────────────────────
    const [
      { data: rawActivities },
      { data: recentWorkouts },
      { data: scoreHistory },
      { data: profile },
    ] = await Promise.all([
      admin
        .from("activity_logs")
        .select("activity_type, duration_seconds, calories_burned, ended_at, source_platform")
        .eq("user_id", user.id)
        .gte("ended_at", thirtyDaysAgo)
        .order("ended_at", { ascending: false })
        .limit(20),
      admin
        .from("workout_progress")
        .select("workout_title, duration_seconds, calories_burned, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", thirtyDaysAgo)
        .order("completed_at", { ascending: false })
        .limit(20),
      admin
        .from("hiit_score_history")
        .select("score, computed_at")
        .eq("user_id", user.id)
        .order("computed_at", { ascending: false })
        .limit(30),
      admin
        .from("profiles")
        .select("display_name, fitness_goal, fitness_level, ai_health_consent")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    // HealthKit / Apple Health consent gate (App Store 5.1.3): only include
    // HealthKit-sourced activities in the AI summary with explicit consent.
    const aiHealthConsent = (profile as any)?.ai_health_consent === true;
    const HEALTHKIT_SOURCES = new Set([
      "apple_watch", "apple_health_native", "healthkit", "healthkit_other",
      "garmin", "fitbit", "whoop", "oura", "polar", "suunto", "coros", "wahoo",
    ]);
    const recentActivities = aiHealthConsent
      ? rawActivities
      : (rawActivities ?? []).filter((a: any) => !HEALTHKIT_SOURCES.has(a.source_platform));

    const totalSessions = (recentActivities?.length ?? 0) + (recentWorkouts?.length ?? 0);
    const totalCalories = [
      ...(recentActivities ?? []).map(a => a.calories_burned ?? 0),
      ...(recentWorkouts ?? []).map(w => w.calories_burned ?? 0),
    ].reduce((a, b) => a + b, 0);
    const totalMinutes = [
      ...(recentActivities ?? []).map(a => Math.floor((a.duration_seconds ?? 0) / 60)),
      ...(recentWorkouts ?? []).map(w => Math.floor((w.duration_seconds ?? 0) / 60)),
    ].reduce((a, b) => a + b, 0);

    const activityTypes = [...new Set((recentActivities ?? []).map(a => a.activity_type))];

    const latestScore = scoreHistory?.[0]?.score ?? null;
    const oldestScore = scoreHistory?.[scoreHistory.length - 1]?.score ?? null;
    const scoreDelta = latestScore !== null && oldestScore !== null && oldestScore > 0
      ? Math.round(((latestScore - oldestScore) / oldestScore) * 100)
      : null;

    const summary = [
      `User: ${profile?.data?.display_name ?? "athlete"}, goal: ${profile?.data?.fitness_goal ?? "general fitness"}, level: ${profile?.data?.fitness_level ?? "intermediate"}`,
      `Last 30 days: ${totalSessions} sessions, ${Math.round(totalCalories)} kcal burned, ${totalMinutes} minutes active`,
      activityTypes.length > 0 ? `Activity types: ${activityTypes.join(", ")}` : null,
      scoreDelta !== null ? `HIIT score change: ${scoreDelta > 0 ? "+" : ""}${scoreDelta}% over 30 days` : null,
    ].filter(Boolean).join(". ");

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are a terse, encouraging fitness coach. Write exactly one sentence (max 20 words) as a personal insight or motivational observation for this athlete based on their recent data. Be specific to their numbers. No generic platitudes. No questions. No emoji.",
        },
        { role: "user", content: summary },
      ],
      max_tokens: 60,
      temperature: 0.7,
      timeout_ms: 15000,
    });

    if (!aiResponse.ok) {
      const fallback = `You've logged ${totalSessions} sessions in the last 30 days — keep that momentum going.`;
      await admin.from("daily_insights").upsert({
        user_id: user.id,
        insight_text: fallback,
        insight_type: "rule",
        generated_at: todayUTC,
      }, { onConflict: "user_id" });
      return json({ insight: fallback, type: "rule", fresh: true });
    }

    const aiData = await aiResponse.json();
    const insightText = aiData.choices?.[0]?.message?.content?.trim() ??
      `You've logged ${totalSessions} sessions in the last 30 days — solid consistency.`;

    await admin.from("daily_insights").upsert({
      user_id: user.id,
      insight_text: insightText,
      insight_type: "ai",
      generated_at: todayUTC,
    }, { onConflict: "user_id" });

    return json({ insight: insightText, type: "ai", fresh: true });

  } catch (err) {
    console.error("generate-daily-insight error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
