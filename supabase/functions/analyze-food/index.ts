import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOOD_ANALYSIS_PROMPT = `You are a nutrition analysis AI for a UK fitness app. Identify every food item visible in this image and estimate its nutrition.

HOW TO IDENTIFY
- Use familiar UK names for what you see: "beans on toast", "jacket potato", "bacon sandwich",
  "Greek yoghurt", "porridge". Not American equivalents.
- DEFAULT TO SPLITTING. Anything served on a base splits into the base and each topping:
  "egg on toast" is "toast" + "fried egg"; "avocado toast with poached egg and seeds" is
  "toast" + "avocado" + "poached egg" + "seeds". A fry-up is one item per component. The user
  adjusts portions per row, so a combined row they can't edit is close to useless to them.
- Only keep something as ONE item when its components are physically blended and could not be
  served apart: soup, smoothie, curry, stew, scrambled egg, porridge.
- A composed dish having a well-known name does NOT make it one item. "Avocado toast" is still
  bread plus avocado. Judge by whether the parts are separable on the plate, not by the name.
- Do NOT list garnishes and seasonings as their own items — herbs, chilli flakes, a squeeze of
  lemon, salt and pepper. Anything under about 5 kcal belongs folded into the dish it sits on,
  not as a row the user has to scroll past.
- Include cooking fat and spreads you can reasonably infer: butter on toast, oil in the pan for
  a fried egg, dressing on a salad. These are a common and material source of underestimation.
  Fold them into the item they belong to rather than listing them separately.

ESTIMATING PORTIONS
Anchor to what's in shot — plate diameter (typically 26-28cm), a slice of bread (~40g), a
standard mug (~250ml), a fork. Keep serving_size SHORT and scannable — "2 slices", "180g",
"1 bowl", "2 eggs". It is displayed in a narrow row in the app. Put any reasoning or detail
in description instead.

CONFIDENCE
Report per item, and be honest: "high" when the food and portion are both clear, "medium" when
the food is clear but the portion is a guess, "low" when the food itself is uncertain.

ALWAYS RETURN YOUR BEST ATTEMPT
If a food is partly obscured, blurry, unfamiliar or ambiguous, still return it with your best
estimate and a "low" confidence — a low-confidence answer the user can correct is far more
useful than a failure. Only use the error form below when the image contains no food at all.

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

Only if the image contains no food whatsoever, return:
{
  "success": false,
  "error": "Description of the issue"
}

Be realistic with nutritional estimates and round numbers sensibly. Return only the JSON object.`;

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

    const callModel = (attempt = 1) => aiChatCompletion({
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
      // The owner reported the same plate scanning differently on repeat attempts. The call
      // was running at the gateway's default sampling temperature, so identical input could
      // produce a different itemisation — or a bail-out — each time. Vision extraction wants
      // the most likely reading, not a varied one.
      // Attempt 1 is greedy for consistency. A retry at the same temperature would be a
      // bit-for-bit repeat of the failure, so attempt 2 deliberately samples differently.
      temperature: attempt === 1 ? 0 : 0.3,
      response_format: { type: "json_object" },
      // gemini-2.5-flash is a thinking model and this ceiling covers reasoning AND output, so
      // too low a value truncates the JSON mid-object and the parse below fails. At 3000 it
      // failed roughly half of test scans; at 8000 a six-item plate still truncated. Itemising
      // properly means long replies, so budget like parse-workout-plan does rather than like
      // the smaller single-answer calls.
      max_tokens: 16000,
    });

    const response = await callModel();

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

    // A scan is a one-shot user action behind a camera capture — there's no cheap way for
    // them to "try again with different wording", and MealScanner turns any failure straight
    // into a dead-end error screen. One retry is worth the latency.
    const readAnalysis = (raw: unknown): Record<string, unknown> | null => {
      if (typeof raw !== "string" || !raw) return null;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    };

    const data = await response.json();
    let analysis = readAnalysis(data.choices?.[0]?.message?.content);

    if (!analysis) {
      console.warn(
        "analyze-food: unusable first response",
        "finish_reason=", data.choices?.[0]?.finish_reason,
        "length=", String(data.choices?.[0]?.message?.content ?? "").length,
      );
      const retry = await callModel(2);
      if (retry.ok) {
        const retryData = await retry.json();
        analysis = readAnalysis(retryData.choices?.[0]?.message?.content);
        if (!analysis) {
          console.error(
            "analyze-food: unusable retry response",
            "finish_reason=", retryData.choices?.[0]?.finish_reason,
            retryData.choices?.[0]?.message?.content,
          );
        }
      }
    }

    if (!analysis) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Food analysis error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
