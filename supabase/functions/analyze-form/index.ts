import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Structured logging utility
function logEvent(level: string, message: string, data: Record<string, unknown> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "analyze-form",
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

const FORM_ANALYSIS_PROMPT = `You are an expert fitness coach analyzing exercise form from an image. Analyze the person's posture and form carefully.

Provide feedback in this exact JSON format:
{
  "overallScore": <number 1-100>,
  "formRating": "<excellent|good|fair|needs_improvement>",
  "posture": {
    "head": "<correct|adjust_up|adjust_down|tilt_left|tilt_right>",
    "shoulders": "<correct|raise|lower|uneven>",
    "back": "<correct|straighten|arch_more|round_less>",
    "hips": "<correct|tilt_forward|tilt_back|uneven>",
    "knees": "<correct|bend_more|straighten|over_toes>",
    "feet": "<correct|wider|narrower|adjust_angle>"
  },
  "keyPoints": [
    "<brief actionable feedback point 1>",
    "<brief actionable feedback point 2>",
    "<brief actionable feedback point 3>"
  ],
  "safetyWarnings": ["<any safety concerns, empty if none>"],
  "encouragement": "<brief encouraging message>"
}

Be specific and actionable in your feedback. Focus on the most important corrections first.`;

serve(async (req) => {
  const correlationId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logEvent("warn", "Authentication failed - missing or invalid header", {
        correlationId,
        eventType: "auth_failure",
        endpoint: "/analyze-form",
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      logEvent("warn", "Authentication failed - invalid token", {
        correlationId,
        eventType: "auth_failure",
        endpoint: "/analyze-form",
        error: authError?.message,
      });
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    logEvent("info", "Form analysis request authenticated", {
      correlationId,
      userId,
      endpoint: "/analyze-form",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const quota = await checkAIQuota(supabaseAdmin, userId, {
      dailyCap: DEFAULT_QUOTAS.analyze_form,
      generationType: "analyze_form",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: userId,
      generation_type: "analyze_form",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const { imageBase64, exerciseName } = await req.json();

    if (!imageBase64) {
      logEvent("warn", "Missing required image parameter", {
        correlationId,
        userId,
      });
      throw new Error('No image provided');
    }

    const exerciseContext = exerciseName ? `The person is performing: ${exerciseName}. ` : '';

    const response = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${exerciseContext}${FORM_ANALYSIS_PROMPT}`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 3000,
    });

    if (!response.ok) {
      const error = await response.text();
      logEvent("error", "AI API error", {
        correlationId,
        userId,
        statusCode: response.status,
        eventType: "external_api_error",
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse form analysis');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    logEvent("info", "Form analysis completed successfully", {
      correlationId,
      userId,
      exerciseName: exerciseName || "unknown",
    });

    return new Response(JSON.stringify(analysis), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      }
    });

  } catch (error) {
    logEvent("error", "Form analysis failed", {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType: "request_error",
    });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      overallScore: 0,
      formRating: 'unknown',
      keyPoints: ['Unable to analyze form. Please try again with a clearer image.'],
      safetyWarnings: [],
      encouragement: 'Keep trying!'
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
      }
    });
  }
});
