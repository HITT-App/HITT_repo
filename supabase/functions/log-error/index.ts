import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Minimal error-ingestion endpoint. The client hits this from ErrorBoundary
// and a global handler; edge functions hit it from their catch blocks.
// Later this can be swapped (or duplicated) to forward to Sentry — the
// request shape is already close to Sentry's events API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogRequest {
  source: string;
  message: string;
  stack?: string;
  url?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Auth is optional — unauthenticated pre-login crashes still want a log.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    const body = (await req.json().catch(() => ({}))) as Partial<LogRequest>;
    if (!body.source || !body.message) {
      return new Response(JSON.stringify({ error: "source and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncate = (s: string | undefined, max: number) =>
      s && s.length > max ? s.slice(0, max) : s ?? null;

    await admin.from("error_logs").insert({
      user_id: userId,
      source: body.source.slice(0, 100),
      message: truncate(body.message, 2000),
      stack: truncate(body.stack, 10000),
      url: truncate(body.url, 500),
      user_agent: truncate(body.user_agent, 500),
      metadata: body.metadata ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-error crashed:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
