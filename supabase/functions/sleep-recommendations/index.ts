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
    const [preferencesResult, logsResult, schedulesResult, consentResult] = await Promise.all([
      supabase
        .from("sleep_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sleep_date", { ascending: false })
        .limit(14),
      supabase
        .from("sleep_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("ai_health_consent")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const preferences = preferencesResult.data;
    // Sleep logs are Apple Health-derived; only send them to the AI provider
    // with the user's explicit consent (App Store 5.1.3).
    const aiHealthConsent = (consentResult.data as any)?.ai_health_consent === true;
    const recentLogs = aiHealthConsent ? (logsResult.data || []) : [];
    const activeSchedule = schedulesResult.data;

    // Calculate sleep stats
    const avgDuration = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / recentLogs.length
      : 0;
    const avgQuality = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / recentLogs.length
      : 0;

    const prompt = `You are an AI sleep coach analyzing a user's sleep data to provide personalized recommendations.

USER SLEEP PROFILE:
- Target sleep: ${preferences?.target_hours || 8} hours ${preferences?.target_minutes || 0} minutes
- Preferred bedtime: ${preferences?.preferred_bedtime || "Not set"}
- Preferred wake time: ${preferences?.preferred_wake_time || "Not set"}
- Sleep issues reported: ${preferences?.sleep_issues || "None specified"}

CURRENT SLEEP SCHEDULE:
- Active days: ${activeSchedule?.active_days?.join(", ") || "Not set"}
- Scheduled bedtime: ${activeSchedule?.bedtime || "Not set"}
- Scheduled wake time: ${activeSchedule?.wake_time || "Not set"}

RECENT SLEEP STATS (last 14 days):
- Nights logged: ${recentLogs.length}
- Average duration: ${Math.round(avgDuration)} minutes (${Math.floor(avgDuration / 60)}h ${Math.round(avgDuration % 60)}m)
- Average quality: ${Math.round(avgQuality)}%
${recentLogs.slice(0, 5).map(log => 
  `- ${log.sleep_date}: ${Math.floor((log.duration_minutes || 0) / 60)}h ${(log.duration_minutes || 0) % 60}m, quality ${log.sleep_quality}%`
).join("\n")}

Based on this data, provide 3-4 actionable sleep improvement recommendations. Consider:
1. Sleep duration vs target
2. Sleep quality patterns
3. Schedule consistency
4. Common sleep issues and solutions
5. Sleep hygiene best practices`;

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate personalized sleep recommendations for me." },
      ],
      tools: [
          {
            type: "function",
            function: {
              name: "generate_sleep_recommendations",
              description: "Generate personalized sleep improvement recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Short catchy title for the recommendation",
                        },
                        description: {
                          type: "string",
                          description: "Detailed explanation of the recommendation and its benefits",
                        },
                        category: {
                          type: "string",
                          enum: ["hygiene", "schedule", "environment", "habits", "relaxation"],
                          description: "Category of the recommendation",
                        },
                        score_reward: {
                          type: "number",
                          description: "Points added to sleep score (1-5)",
                        },
                      },
                      required: ["title", "description", "category", "score_reward"],
                    },
                  },
                  bedtime_recommendation: {
                    type: "string",
                    description: "Optimal bedtime recommendation (HH:MM format)",
                  },
                  sleep_insight: {
                    type: "string",
                    description: "A personalized insight about the user's sleep patterns",
                  },
                },
                required: ["recommendations", "sleep_insight"],
              },
            },
          },
      ],
      tool_choice: { type: "function", function: { name: "generate_sleep_recommendations" } },
      max_tokens: 3000,
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

    // Save recommendations to database
    if (recommendations.length > 0) {
      // Delete old recommendations
      await supabase
        .from("sleep_recommendations")
        .delete()
        .eq("user_id", user.id);

      // Insert new recommendations
      const insertData = recommendations.map((rec: any) => ({
        user_id: user.id,
        title: rec.title,
        description: rec.description,
        category: rec.category || "sleep",
        score_reward: Math.min(Math.max(rec.score_reward || 3, 1), 5),
        status: "pending",
      }));

      await supabase.from("sleep_recommendations").insert(insertData);
    }

    return new Response(
      JSON.stringify({
        recommendations,
        bedtimeRecommendation: result.bedtime_recommendation,
        sleepInsight: result.sleep_insight,
        stats: {
          nightsLogged: recentLogs.length,
          avgDuration: Math.round(avgDuration),
          avgQuality: Math.round(avgQuality),
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
