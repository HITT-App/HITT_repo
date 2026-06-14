import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quota = await checkAIQuota(supabaseAdmin, userData.user.id, {
      dailyCap: DEFAULT_QUOTAS.parse_workout_plan,
      generationType: "parse_workout_plan",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: userData.user.id,
      generation_type: "parse_workout_plan",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const body = await req.json();
    const { content, contentType, userGoal, fitnessLevel, bodyScanSummary } = body;

    if (!content) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContext = [
      userGoal ? `Goal: ${userGoal}` : null,
      fitnessLevel ? `Fitness level: ${fitnessLevel}` : null,
      bodyScanSummary ? `Body scan: ${bodyScanSummary}` : null,
    ].filter(Boolean).join("\n") || "No user profile data available.";

    const prompt = `You are an expert fitness coach reviewing a workout plan uploaded by a user.
Extract every session and exercise from the plan, then assess how well it aligns with the user's profile.

User profile:
${userContext}

Instructions:
- Extract ALL sessions and exercises exactly as written — do not invent exercises
- Assign each session a day_of_week (0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat) based on what the plan says, or spread evenly if not specified
- Assign week_number starting at 1; if the plan is one repeating week, all sessions are week 1
- For exercises: use sets+reps for strength, duration_seconds for cardio/timed, or both if specified
- Estimate duration_minutes per session if not stated
- alignmentScore: 0-100 reflecting how well this matches the user's goal and body scan
- adjustmentNotes: 1-3 specific callouts only if genuinely needed (not generic advice); empty array if plan is solid
- If you suggest adjustments, include adjustedSessions with the modified version; omit adjustedSessions entirely if no changes are needed
- Speak directly to the user ("your plan", "you should") in assessment text

Return ONLY valid JSON in this exact shape:
{
  "planTitle": "string",
  "assessment": "string (2-3 sentences, direct second-person)",
  "alignmentScore": number,
  "adjustmentNotes": ["string"],
  "sessions": [
    {
      "title": "string",
      "category": "strength|cardio|hiit|recovery|flexibility|sports",
      "duration_minutes": number,
      "calories_burned": number,
      "day_of_week": number,
      "week_number": number,
      "exercises": [
        {
          "title": "string",
          "description": "string|null",
          "sets": number|null,
          "reps": number|null,
          "duration_seconds": number|null,
          "body_area": "string",
          "order_index": number,
          "thumbnail_url": null,
          "video_url": null
        }
      ]
    }
  ],
  "adjustedSessions": []
}`;

    const messageContent: any[] = [{ type: "text", text: prompt }];
    if (contentType === "image") {
      messageContent.push({
        type: "image_url",
        image_url: { url: content.startsWith("data:") ? content : `data:image/jpeg;base64,${content}` },
      });
    } else {
      messageContent.push({ type: "text", text: `\n\nPlan content:\n${content}` });
    }

    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: messageContent }],
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No response from AI");

    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return structured JSON");

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-workout-plan error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
