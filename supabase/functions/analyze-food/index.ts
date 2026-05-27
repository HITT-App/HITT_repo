import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOD_ANALYSIS_PROMPT = `You are a nutrition analysis AI. Analyze ALL food items visible in this image and provide nutritional estimates for EACH item separately.

Return your response in this exact JSON format:
{
  "success": true,
  "items": [
    {
      "food_name": "Name of the food item",
      "description": "Brief description",
      "serving_size": "Estimated serving size (e.g., '1 cup', '200g')",
      "calories": <number>,
      "protein_grams": <number>,
      "carbs_grams": <number>,
      "fat_grams": <number>,
      "fiber_grams": <number>,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "total_calories": <number>,
  "total_protein_grams": <number>,
  "total_carbs_grams": <number>,
  "total_fat_grams": <number>,
  "total_fiber_grams": <number>,
  "health_notes": "Brief health notes about this meal",
  "suggestions": "Any suggestions for making this meal healthier"
}

If you cannot identify any food or the image doesn't contain food, return:
{
  "success": false,
  "error": "Description of the issue"
}

Detect ALL separate food items. Be accurate but realistic with nutritional estimates. Round numbers appropriately.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const quota = await checkAIQuota(supabaseAdmin, user.id, {
      dailyCap: DEFAULT_QUOTAS.analyze_food,
      generationType: "analyze_food",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: user.id,
      generation_type: "analyze_food",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const { imageData } = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ success: false, error: "No image data provided" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedImageData = imageData;
    if (!processedImageData.startsWith("data:")) {
      processedImageData = `data:image/jpeg;base64,${processedImageData}`;
    }

    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: processedImageData },
            },
            {
              type: "text",
              text: FOOD_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 3000,
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to analyze food" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: "No response from AI" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const analysis = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify(analysis), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse analysis" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Food analysis error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
