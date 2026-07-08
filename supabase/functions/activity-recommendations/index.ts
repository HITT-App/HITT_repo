import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user data in parallel
    const [preferencesResult, goalsResult, logsResult, consentResult] = await Promise.all([
      supabase
        .from("activity_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("activity_goals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("ai_health_consent")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const preferences = preferencesResult.data;
    const goals = goalsResult.data;
    // Only send HealthKit-sourced activities to the AI with explicit consent (5.1.3).
    const aiHealthConsent = (consentResult.data as any)?.ai_health_consent === true;
    const HEALTHKIT_SOURCES = new Set([
      "apple_watch", "apple_health_native", "healthkit", "healthkit_other",
      "garmin", "fitbit", "whoop", "oura", "polar", "suunto", "coros", "wahoo",
    ]);
    const recentLogs = aiHealthConsent
      ? (logsResult.data || [])
      : (logsResult.data || []).filter((a: any) => !HEALTHKIT_SOURCES.has(a.source_platform));

    // Calculate weekly stats
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyLogs = recentLogs.filter(
      (log) => new Date(log.started_at) >= weekStart
    );

    const weeklyStats = {
      activities: weeklyLogs.length,
      calories: weeklyLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0),
      distance: weeklyLogs.reduce((sum, log) => sum + Number(log.distance_km || 0), 0),
      duration: weeklyLogs.reduce((sum, log) => sum + (log.duration_seconds || 0) / 60, 0),
    };

    // Build context for AI
    const activityTypes = preferences?.activity_types || [];
    const preferredTime = preferences?.preferred_time || "morning";
    const intensityLevel = preferences?.intensity_level || 3;
    const typicalDuration = preferences?.typical_duration_minutes || 30;

    const weeklyGoals = {
      activities: goals?.weekly_activities || 5,
      calories: goals?.weekly_calories || 1500,
      distance: goals?.weekly_distance_km || 10,
      duration: goals?.weekly_duration_minutes || 150,
    };

    // Analyze recent activity patterns
    const activityCounts: Record<string, number> = {};
    recentLogs.forEach((log) => {
      activityCounts[log.activity_type] = (activityCounts[log.activity_type] || 0) + 1;
    });

    const prompt = `You are an AI fitness coach analyzing a user's activity data to provide personalized recommendations.

USER PROFILE:
- Preferred activities: ${activityTypes.length > 0 ? activityTypes.join(", ") : "not specified"}
- Preferred workout time: ${preferredTime}
- Typical workout duration: ${typicalDuration} minutes
- Intensity level preference: ${intensityLevel}/5

WEEKLY GOALS:
- Target activities: ${weeklyGoals.activities}/week
- Target calories: ${weeklyGoals.calories} kcal/week
- Target distance: ${weeklyGoals.distance} km/week
- Target duration: ${weeklyGoals.duration} min/week

CURRENT WEEKLY PROGRESS:
- Activities completed: ${weeklyStats.activities}
- Calories burned: ${weeklyStats.calories} kcal
- Distance covered: ${weeklyStats.distance.toFixed(1)} km
- Total duration: ${Math.round(weeklyStats.duration)} min

RECENT ACTIVITY HISTORY (last 20):
${recentLogs.length > 0 
  ? recentLogs.slice(0, 10).map(log => 
    `- ${log.activity_type}: ${Math.round((log.duration_seconds || 0) / 60)}min, ${log.calories_burned || 0}kcal, intensity ${log.intensity_level || 3}/5`
  ).join("\n")
  : "No recent activities logged"}

Based on this data, provide 3-4 personalized activity recommendations. Consider:
1. Progress toward weekly goals
2. Activity variety and balance
3. Recovery needs based on recent intensity
4. User preferences for time and intensity
5. Motivation and engagement`;

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate personalized activity recommendations for me." },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Generate personalized activity recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        activity_type: {
                          type: "string",
                          description: "Type of activity (e.g., jogging, cycling, swimming, yoga, walking)",
                        },
                        title: {
                          type: "string",
                          description: "Short catchy title for the recommendation",
                        },
                        description: {
                          type: "string",
                          description: "Brief explanation of why this activity is recommended",
                        },
                        suggested_duration_minutes: {
                          type: "number",
                          description: "Recommended duration in minutes",
                        },
                        suggested_time: {
                          type: "string",
                          description: "Best time of day for this activity (morning, afternoon, evening)",
                        },
                        intensity: {
                          type: "string",
                          enum: ["low", "moderate", "high"],
                          description: "Recommended intensity level",
                        },
                        estimated_calories: {
                          type: "number",
                          description: "Estimated calories to burn",
                        },
                        score_reward: {
                          type: "number",
                          description: "Points added to activity score (1-5)",
                        },
                      },
                      required: ["activity_type", "title", "description", "suggested_duration_minutes", "intensity", "estimated_calories", "score_reward"],
                    },
                  },
                  motivational_message: {
                    type: "string",
                    description: "A short motivational message based on the user's progress",
                  },
                },
                required: ["recommendations", "motivational_message"],
              },
            },
          },
      ],
      tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      max_tokens: 4000,
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", aiData);
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const recommendations = result.recommendations || [];
    const motivationalMessage = result.motivational_message || "";

    // Save recommendations to database
    if (recommendations.length > 0) {
      // Delete old recommendations
      await supabase
        .from("activity_recommendations")
        .delete()
        .eq("user_id", user.id);

      // Insert new recommendations
      const insertData = recommendations.map((rec: any) => ({
        user_id: user.id,
        activity_type: rec.activity_type,
        title: rec.title,
        description: rec.description,
        suggested_duration_minutes: rec.suggested_duration_minutes,
        suggested_time: rec.suggested_time || preferredTime,
        intensity: rec.intensity,
        estimated_calories: rec.estimated_calories,
        score_reward: Math.min(Math.max(rec.score_reward || 3, 1), 5),
        status: "pending",
      }));

      await supabase.from("activity_recommendations").insert(insertData);
    }

    return new Response(
      JSON.stringify({
        recommendations,
        motivationalMessage,
        weeklyProgress: {
          ...weeklyStats,
          goals: weeklyGoals,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
