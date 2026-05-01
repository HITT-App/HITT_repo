import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { aiChatCompletion } from "../_shared/ai-client.ts";
import { checkAIQuota, quotaExceededResponse, DEFAULT_QUOTAS } from "../_shared/ai-quota.ts";

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const quota = await checkAIQuota(supabaseAdmin, user.id, {
      dailyCap: DEFAULT_QUOTAS.activity_image,
      generationType: "activity_image",
    });
    if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);

    await supabaseAdmin.from("ai_generation_log").insert({
      user_id: user.id,
      generation_type: "activity_image",
      model: "gemini-2.5-flash",
      prompt: { redacted: true },
    });

    const { activityType, stats, userPhotoUrl, userPhotoBase64 } = await req.json();

    // Build stats overlay text
    const statsText = (stats as Array<{ label: string; value: string | number; unit?: string }>)
      .map((s) => `${s.label}: ${s.value}${s.unit ? " " + s.unit : ""}`)
      .join("  •  ");

    const activityName = (activityType || "workout").toLowerCase();

    // Determine if we have a user photo to incorporate
    const hasUserPhoto = !!(userPhotoUrl || userPhotoBase64);

    const sceneMap: Record<string, string> = {
      run: "sprinting on an urban road at dusk with a glowing neon orange trail, motion blur energy",
      jogging: "running through a misty park at sunrise with warm golden light rays filtering through trees",
      walking: "walking on a scenic mountain trail at golden hour with dramatic clouds",
      walk: "walking on a scenic mountain trail at golden hour with dramatic clouds",
      hike: "standing on a dramatic mountain ridge at sunset with clouds below and epic sky",
      cycling: "cycling on a highway at twilight with speed blur and warm orange glow trails",
      swimming: "swimming through glowing turquoise water with dramatic underwater light beams",
      swim: "swimming through glowing turquoise water with dramatic underwater light beams",
      yoga: "in warrior pose at sunset on a cliff overlooking the ocean with warm tones",
      hiit: "mid-workout in a dark gym with dramatic orange spotlight beams and energy particles",
      workout: "in powerful stance with dramatic cinematic orange lighting and energy particles",
    };

    const scene = sceneMap[activityName] || sceneMap["workout"];

    // Branding lives in the public app-assets bucket (activity-images is now
    // private for user-generated content).
    const logoUrl = `${Deno.env.get("SUPABASE_URL")!}/storage/v1/object/public/app-assets/branding/hiit-watermark.png`;

    let prompt: string;
    let messageContent: any;

    const watermarkInstruction = `The second image provided is the HIIT brand logo. Place this EXACT logo as a subtle semi-transparent watermark in the top-right corner of the generated image at about 15-20% opacity. The logo should be small (roughly 10-12% of the image width) and recognizable but not distracting.`;

    if (hasUserPhoto) {
      prompt = `Transform the first person's photo into a premium 1:1 square fitness share card image.

IMPORTANT: Keep the person's face and likeness clearly recognizable. Place them into a dramatic, cinematic fitness scene where they appear to be ${scene}.

${watermarkInstruction}

LAYOUT:
- Top-right corner: The HIIT logo watermark (from the second reference image) at low opacity
- Center: The person from the first photo, dramatically placed in the fitness scene
- Bottom: A sleek semi-transparent dark gradient bar with workout stats in clean white typography:
  ${statsText}

STYLE:
- Square 1:1 aspect ratio
- Ultra-cinematic, dramatic lighting
- Dark moody atmosphere with warm orange/amber accent glow
- The person should look heroic and powerful in the scene
- Stats text clearly legible on dark gradient
- Premium fitness app aesthetic — aspirational and shareable
- Make it look like a professional sports magazine cover`;

      const photoUrl = userPhotoBase64 || userPhotoUrl;
      messageContent = [
        { type: "image_url", image_url: { url: photoUrl } },
        { type: "image_url", image_url: { url: logoUrl } },
        { type: "text", text: prompt },
      ];
    } else {
      prompt = `Create a premium 1:1 square fitness share card image (Instagram post style).

SCENE: A dramatic silhouette of an athlete ${scene}

${watermarkInstruction}

LAYOUT:
- Top-right corner: The HIIT logo watermark (from the provided reference image) at low opacity
- Center: The dramatic cinematic scene fills the entire square
- Bottom: A sleek semi-transparent dark gradient bar with workout stats in clean white typography:
  ${statsText}

STYLE:
- Square 1:1 aspect ratio
- Ultra-cinematic, dramatic lighting
- Dark moody atmosphere with warm orange/amber accent glow
- Premium fitness app aesthetic — bold, inspiring, social-media ready
- Stats text clearly legible on dark gradient
- Overall feeling: premium, aspirational, shareable`;

      messageContent = [
        { type: "image_url", image_url: { url: logoUrl } },
        { type: "text", text: prompt },
      ];
    }

    const aiResponse = await aiChatCompletion({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: messageContent }],
      modalities: ["image", "text"],
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

    // Signed URL (1 week) because the bucket is private. Clients should
    // refresh the URL from storage on expiry.
    const { data: signed, error: signedError } = await adminClient.storage
      .from("activity-images")
      .createSignedUrl(fileName, 7 * 24 * 3600);

    if (signedError || !signed) {
      console.error("Signed URL error:", signedError);
      return new Response(JSON.stringify({ error: "Failed to sign image URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ imageUrl: signed.signedUrl, path: fileName }), {
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
