import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const quota = await checkAIQuota(supabaseAdmin, user.id, {
      dailyCap: DEFAULT_QUOTAS.smart_insights,
      generationType: "smart_insights",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: user.id,
      generation_type: "smart_insights",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const { type, activityData, mealName, mealDescription } = await req.json();

    // Gather user context
    const userId = user.id;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const today = now.toISOString().split("T")[0];

    const [profileRes, streakRes, workoutsRes, sleepRes, moodRes, activityRes, mealsRes] = await Promise.all([
      supabase.from("profiles").select("display_name, fitness_level, goals, ai_health_consent").eq("user_id", userId).maybeSingle(),
      supabase.from("streaks").select("current_streak, longest_streak").eq("user_id", userId).maybeSingle(),
      supabase.from("workout_progress").select("workout_id, duration_seconds, completed_at, created_at").eq("user_id", userId).gte("created_at", weekAgo),
      supabase.from("health_metrics").select("value, recorded_at").eq("user_id", userId).eq("metric_type", "sleep").gte("recorded_at", weekAgo).order("recorded_at", { ascending: false }).limit(7),
      supabase.from("daily_checkins").select("mood, energy, date").eq("user_id", userId).order("date", { ascending: false }).limit(3),
      supabase.from("activity_logs").select("activity_type, duration_seconds, calories_burned, distance_km, started_at, source_platform").eq("user_id", userId).gte("started_at", weekAgo).order("started_at", { ascending: false }),
      supabase.from("meal_logs").select("calories, protein_grams, carbs_grams, fat_grams, logged_at").eq("user_id", userId).gte("logged_at", weekAgo),
    ]);

    const profile = profileRes.data;
    const streak = streakRes.data;
    const workouts = workoutsRes.data || [];
    const moods = moodRes.data || [];
    const meals = mealsRes.data || [];

    // HealthKit / Apple Health consent gate (App Store 5.1.3): only send sleep
    // and HealthKit-sourced activities to the AI provider with explicit consent.
    const aiHealthConsent = (profileRes.data as any)?.ai_health_consent === true;
    const HEALTHKIT_SOURCES = new Set([
      "apple_watch", "apple_health_native", "healthkit", "healthkit_other",
      "garmin", "fitbit", "whoop", "oura", "polar", "suunto", "coros", "wahoo",
    ]);
    const sleepData = aiHealthConsent ? (sleepRes.data || []) : [];
    const activities = aiHealthConsent
      ? (activityRes.data || [])
      : (activityRes.data || []).filter((a: any) => !HEALTHKIT_SOURCES.has(a.source_platform));

    const avgSleep = sleepData.length > 0 ? (sleepData.reduce((a, s) => a + (s.value || 0), 0) / sleepData.length).toFixed(1) : null;
    const totalWorkouts = workouts.length;
    const totalActivities = activities.length;
    const totalCalories = activities.reduce((a, act) => a + (act.calories_burned || 0), 0);
    const totalDistance = activities.reduce((a, act) => a + (act.distance_km || 0), 0).toFixed(1);
    const totalWorkoutMin = Math.floor(workouts.reduce((a, w) => a + (w.duration_seconds || 0), 0) / 60);
    const latestMood = moods[0];
    const avgDailyCalIntake = meals.length > 0 ? Math.round(meals.reduce((a, m) => a + (m.calories || 0), 0) / 7) : null;

    const contextBlock = `
USER: ${profile?.display_name || "Athlete"}
Fitness level: ${profile?.fitness_level || "unknown"} | Goals: ${profile?.goals || "general fitness"}
Current streak: ${streak?.current_streak || 0} days | Longest: ${streak?.longest_streak || 0} days
This week: ${totalWorkouts} workouts (${totalWorkoutMin} min), ${totalActivities} activities, ${totalCalories} cal burned, ${totalDistance} km
Sleep avg: ${avgSleep ? avgSleep + "h" : "no data"}
Latest mood: ${latestMood ? `${latestMood.mood} (energy ${latestMood.energy}/5)` : "no data"}
Avg daily calorie intake: ${avgDailyCalIntake ? avgDailyCalIntake + " cal" : "no data"}
Today: ${today} (${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][now.getDay()]})
`.trim();

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "daily-briefing") {
      systemPrompt = `You are an elite AI fitness coach generating a DAILY BRIEFING for a fitness app dashboard.
      
RULES:
- Respond in EXACTLY 3-4 short lines. No more.
- Line 1: Personalized greeting + how they're doing based on data
- Line 2: One specific insight or observation from their data
- Line 3: One clear action recommendation for today
- Line 4 (optional): Quick motivational closer
- Use 1-2 emojis max. No headers, no bullets, no markdown formatting.
- Sound like a smart coach texting, not a report.
- Be SPECIFIC — reference real numbers from their data.
- If little data, be encouraging about getting started.`;
      userPrompt = `Generate today's daily briefing.\n\n${contextBlock}`;

    } else if (type === "post-activity") {
      const act = activityData || {};
      systemPrompt = `You are an elite AI fitness coach generating a POST-ACTIVITY INSIGHT after a user completes a workout/activity.

RULES:
- Respond in EXACTLY 2-3 short lines.
- Be specific about what they just did and how it fits their week.
- Compare to their patterns if data exists (e.g. "fastest this week", "longest session").
- Include one forward-looking suggestion.
- Punchy, celebratory, specific. Like a coach high-fiving you.
- Use 1-2 emojis. No markdown headers.`;
      userPrompt = `User just completed: ${act.title || "Activity"}
Type: ${act.type || "workout"}
Duration: ${act.duration || "unknown"}
Calories: ${act.calories || "unknown"}
Distance: ${act.distance || "N/A"}

${contextBlock}`;

    } else if (type === "weekly-report") {
      systemPrompt = `You are an elite AI fitness coach generating a WEEKLY TRAINING REPORT.

RULES:
- Use these exact emoji section headers (nothing else):
  📊 Overview
  🏆 Highlights  
  💡 Insights
  🎯 Next Week
- Under each header, write 2-3 SHORT bullet points (use •)
- Be data-driven — reference specific numbers
- Under Insights, note trends (improving pace, consistency, recovery needs)
- Under Next Week, give 2 specific actionable recommendations
- Total response should be ~12-15 lines. No more.
- If limited data, adjust gracefully but still provide value.`;
      userPrompt = `Generate this week's training report.\n\n${contextBlock}`;

    } else if (type === "nutrition-estimate") {
      systemPrompt = `You are a nutrition expert. Estimate the nutritional content of a meal from its name and description.
Return ONLY a valid JSON object with exactly these four fields (integers):
{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}
No markdown, no explanation, no extra fields. One standard serving.`;
      userPrompt = `Meal: ${mealName || "Unknown meal"}\nDescription: ${mealDescription || "No description provided"}`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (type === "nutrition-estimate") {
      try {
        const json = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
        return new Response(JSON.stringify({ nutrition: json }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Could not parse nutrition estimate" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ insight: content || "No insight available right now." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("smart-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
