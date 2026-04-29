import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user
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

    // Require typed confirmation
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") {
      return new Response(JSON.stringify({ error: "Confirmation required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const uid = user.id;

    // Soft-delete all user-scoped tables that have a deleted_at column.
    // The hard-delete cascade (auth.users + remaining tables) runs 30 days
    // later via a cleanup job, giving the user a restore window.
    const tables = [
      "profiles",
      "meal_logs",
      "sleep_logs",
      "scheduled_workouts",
      "health_metrics",
      "community_posts",
      "community_comments",
      "community_likes",
      "community_follows",
      "user_streaks",
      "ai_generation_log",
      "push_subscriptions",
    ];

    await Promise.all(
      tables.map((table) =>
        admin.from(table).update({ deleted_at: now }).eq("user_id", uid)
      )
    );

    // profiles uses id not user_id
    await admin.from("profiles").update({ deleted_at: now }).eq("id", uid);

    // Sign out all sessions for this user
    await admin.auth.admin.signOut(uid, "global");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
