import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Structured logging utility
function logEvent(level: string, message: string, data: Record<string, unknown> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "elevenlabs-scribe-token",
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req) => {
  const correlationId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logEvent("warn", "Authentication failed - missing or invalid header", {
        correlationId,
        eventType: "auth_failure",
        endpoint: "/elevenlabs-scribe-token",
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
        endpoint: "/elevenlabs-scribe-token",
        error: authError?.message,
      });
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    logEvent("info", "Scribe token request authenticated", {
      correlationId,
      userId,
      endpoint: "/elevenlabs-scribe-token",
    });

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      logEvent("error", "Missing ELEVENLABS_API_KEY configuration", {
        correlationId,
        eventType: "config_error",
      });
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logEvent("error", "ElevenLabs token API error", {
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
      
      throw new Error(`Failed to get scribe token: ${response.status}`);
    }

    const { token: scribeToken } = await response.json();

    logEvent("info", "Scribe token issued successfully", {
      correlationId,
      userId,
    });

    return new Response(JSON.stringify({ token: scribeToken }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
    });
  } catch (error) {
    logEvent("error", "Scribe token request failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
      eventType: "request_error",
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-ID": correlationId },
      }
    );
  }
});
