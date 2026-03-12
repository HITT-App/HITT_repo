import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { activityType, stats } = await req.json();

    // Build stats overlay text
    const statsText = (stats as Array<{ label: string; value: string | number; unit?: string }>)
      .map((s) => `${s.label}: ${s.value}${s.unit ? " " + s.unit : ""}`)
      .join(" | ");

    const activityName = (activityType || "workout").toLowerCase();
    const sceneMap: Record<string, string> = {
      run: "a runner silhouette sprinting on an urban road at dusk with a glowing neon trail behind them",
      jogging: "a jogger silhouette running through a misty park at sunrise with golden light rays",
      walking: "a walker silhouette on a scenic mountain trail at golden hour",
      walk: "a walker silhouette on a scenic mountain trail at golden hour",
      hike: "a hiker standing on a dramatic mountain ridge at sunset with clouds below",
      cycling: "a cyclist silhouette racing on a highway at twilight with speed blur and neon glow",
      swimming: "a swimmer cutting through glowing turquoise water with dramatic underwater lighting",
      swim: "a swimmer cutting through glowing turquoise water with dramatic underwater lighting",
      yoga: "a yoga practitioner in a tree pose silhouette at sunset on a cliff overlooking the ocean",
      hiit: "an athlete mid-burpee in a dark gym with dramatic spotlight and sweat particles",
      workout: "an athlete working out with dramatic cinematic lighting and energy particles",
    };

    const scene = sceneMap[activityName] || sceneMap["workout"];

    const prompt = `Create a dramatic, cinematic fitness share card image. The scene shows ${scene}. 
    
At the bottom of the image, overlay these workout stats in a clean, modern typography style with a semi-transparent dark bar:
${statsText}

Style: Ultra-cinematic, dramatic lighting, dark moody atmosphere with vibrant accent colors (electric blue or orange glow). 
The image should look like a premium fitness app share card — bold, inspiring, and social-media ready.
Make the stats text clearly legible against the background.
Aspect ratio: 9:16 portrait format for mobile sharing.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Gemini image generation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageDataUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "No image was generated. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 data from data URL
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = decode(base64Data);

    // Upload to storage
    const fileName = `${user.id}/${Date.now()}-activity.png`;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await adminClient.storage
      .from("activity-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = adminClient.storage
      .from("activity-images")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-activity-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
