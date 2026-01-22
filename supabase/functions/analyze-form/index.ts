import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, exerciseName } = await req.json();

    if (!imageBase64) {
      throw new Error('No image provided');
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const exerciseContext = exerciseName ? `The person is performing: ${exerciseName}. ` : '';

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
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

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Form analysis error:', error);
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
