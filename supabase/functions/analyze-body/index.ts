import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const buildBodyAnalysisPrompt = (workoutSummary: string, imageCount: number) =>
  `You are an expert fitness and body composition analyst. Analyze ${imageCount > 1 ? `these ${imageCount} body photos (front, side, and back views)` : "this body photo"} and speak directly to the person — use second person throughout ("you", "your"). Never refer to the subject in third person ("they", "the person", "their").

User's recent workout history (last 30 days): ${workoutSummary}

Cross-reference this workout history when writing the recommendations section. For example, if the user does no strength training, suggest adding it; if they run frequently, comment on how their lower-body development reflects that; if the data is absent, give general guidance.

Provide your analysis in this exact JSON format. All "keyObservations" and "recommendations" strings MUST address the user in second person (e.g. "Your upper body shows…", "You would benefit from…"):
{
  "estimatedBodyFat": <number 5-50, your best estimate of body fat percentage>,
  "bodyType": "<ectomorph|mesomorph|endomorph|ecto-mesomorph|endo-mesomorph>",
  "muscleDevelopment": {
    "upper_body": "<underdeveloped|average|developed|well_developed>",
    "core": "<underdeveloped|average|developed|well_developed>",
    "lower_body": "<underdeveloped|average|developed|well_developed>"
  },
  "visibleMuscleGroups": ["<list visible muscle groups that show definition>"],
  "bodySymmetry": "<balanced|left_dominant|right_dominant|upper_dominant|lower_dominant>",
  "posture": "<excellent|good|fair|needs_improvement>",
  "keyObservations": [
    "<observation 1>",
    "<observation 2>",
    "<observation 3>"
  ],
  "recommendations": [
    "<actionable recommendation 1 — reference workout patterns where relevant>",
    "<actionable recommendation 2>",
    "<actionable recommendation 3>"
  ],
  "confidenceLevel": "<high|medium|low>"
}

Be encouraging and constructive. Focus on areas of strength and provide specific, actionable improvement suggestions. Note: this is an AI estimate, not a medical assessment.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quota = await checkAIQuota(supabaseAdmin, userData.user.id, {
      dailyCap: DEFAULT_QUOTAS.analyze_body,
      generationType: "analyze_body",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: userData.user.id,
      generation_type: "analyze_body",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const body = await req.json();
    // Accept either multi-image { images: string[] } or legacy { imageBase64: string }
    const rawImages: string[] = Array.isArray(body.images)
      ? body.images
      : body.imageBase64
      ? [body.imageBase64]
      : [];

    if (rawImages.length === 0) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { workoutSummary } = body;
    const prompt = buildBodyAnalysisPrompt(
      typeof workoutSummary === "string" && workoutSummary.trim()
        ? workoutSummary.trim()
        : "No workout data available.",
      rawImages.length,
    );

    const imageParts = rawImages.map(img => ({
      type: "image_url",
      image_url: {
        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`
      }
    }));

    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageParts,
        ]
      }],
      max_tokens: 5000,
      response_format: { type: "json_object" },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const errorText = await response.text();
      throw new Error(`AI API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    // Strip markdown code fences if model wrapped the JSON
    const stripped = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    // Find the outermost JSON object
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Non-JSON response from Gemini:", content.slice(0, 500));
      throw new Error(`AI did not return a structured analysis. Try a clearer full-body photo in good lighting.`);
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Body analysis error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
