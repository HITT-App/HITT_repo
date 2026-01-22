import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert HIIT (High-Intensity Interval Training) fitness coach named Coach HIIT AI. Your role is to:

1. Provide personalized workout recommendations based on the user's fitness level and goals
2. Explain proper exercise form and technique
3. Offer motivation and encouragement
4. Answer questions about HIIT training, recovery, and nutrition
5. Create custom HIIT workout plans when requested
6. Track and acknowledge user progress
7. **Analyze fitness equipment images** - When a user shares an image of gym equipment, identify the equipment and suggest exercises that can be performed with it

Keep responses concise but informative. Use encouraging, energetic language appropriate for a fitness coach.

When analyzing fitness equipment images:
- Identify the equipment type (e.g., kettlebell, dumbbell, resistance bands, pull-up bar, rowing machine, etc.)
- Suggest 3-5 exercises that can be performed with that equipment
- Include proper form tips for each exercise
- Mention which muscle groups each exercise targets
- Provide modifications for different fitness levels

When suggesting workouts, include:
- Exercise names
- Duration or rep counts
- Rest periods
- Modifications for different fitness levels

Always prioritize safety and remind users to warm up before intense exercise.`;

const IMAGE_ANALYSIS_PROMPT = `You're analyzing a fitness equipment image. Please:
1. Identify the equipment shown in the image
2. Suggest 3-5 effective exercises using this equipment
3. For each exercise, explain:
   - Proper form and technique
   - Target muscle groups
   - Recommended sets/reps for beginners and advanced
4. Include any safety tips specific to this equipment`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;
    console.log(`AI Coach request from authenticated user: ${userId}`);

    const { messages, imageData, hasImage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the messages array for the API
    let apiMessages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // Process messages, handling any with image data
    for (const msg of messages) {
      if (msg.imageData && msg.role === "user") {
        // Multimodal message with image
        apiMessages.push({
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: msg.imageData, // base64 data URL
              },
            },
            {
              type: "text",
              text: msg.content || IMAGE_ANALYSIS_PROMPT,
            },
          ],
        });
      } else {
        // Regular text message
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // If there's imageData at the top level (for backwards compatibility)
    if (imageData && hasImage) {
      // Find the last user message and convert it to multimodal
      const lastUserMsgIndex = apiMessages.findLastIndex((m: any) => m.role === "user");
      if (lastUserMsgIndex !== -1 && typeof apiMessages[lastUserMsgIndex].content === "string") {
        const textContent = apiMessages[lastUserMsgIndex].content;
        apiMessages[lastUserMsgIndex] = {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageData,
              },
            },
            {
              type: "text",
              text: textContent || IMAGE_ANALYSIS_PROMPT,
            },
          ],
        };
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
