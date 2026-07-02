import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Account deletion — Apple Guideline 5.1.1(v) + GDPR Article 17.
// Two-stage flow:
//  1. Immediately on user tap: soft-delete primary user data (deleted_at
//     = now()), hard-delete config/preference rows (regenerable), revoke
//     third-party integrations (Garmin), sign out all sessions.
//  2. 30 days later: pg_cron invokes `purge-deleted-accounts` which
//     hard-deletes the soft-deleted rows and drops the auth.users row.
//
// Restore window: within 30 days a user can regain their primary data
// by asking support to null the deleted_at columns. After 30 days the
// data is gone.
//
// Keep this table list in sync with the purge function.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Primary-data tables — soft-delete now, hard-purge at day 30.
const SOFT_DELETE_TABLES = [
  "profiles",
  "activity_logs",
  "body_scans",
  "meal_logs",
  "sleep_logs",
  "scheduled_workouts",
  "health_metrics",
  "conversations",
  "messages",
  "daily_checkins",
  "hiit_score_history",
  "user_streaks",
  "ai_generation_log",
  "community_posts",
  "community_comments",
  "community_likes",
  "community_follows",
  "community_reactions",
  "community_saved_posts",
  "community_stories",
  "community_notifications",
  "community_poll_votes",
  "push_subscriptions",
];

// Preferences / config — hard-delete immediately (regenerable on restore).
// If any of these fail we still return 200; the primary soft-delete is
// what matters for compliance.
const HARD_DELETE_TABLES_USER_ID = [
  "activity_goals",
  "activity_preferences",
  "workout_preferences",
  "user_workout_preferences",
  "nutrition_goals",
  "nutrition_profiles",
  "notification_preferences",
  "sleep_preferences",
  "sleep_schedules",
  "sleep_recommendations",
  "activity_recommendations",
  "coaching_preferences",
  "home_layout",
  "google_fit_connections",
  "user_goals",
  "user_levels",
  "user_badges",
  "achievement_progress",
  "challenge_enrollments",
  "leaderboard_scores",
  "user_meal_plan_items",
  "user_meal_plans",
  "user_workout_plan_items",
  "user_workout_plans",
  "workout_progress",
  "community_blocks",
  "community_story_views",
  "user_friends",
  "accountability_pairs",
];

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Require typed confirmation — matches the client-side modal copy.
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") {
      return new Response(JSON.stringify({ error: "Confirmation required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();
    const uid = user.id;

    // Soft-delete primary-data tables. profiles keys on `id`, everything
    // else on `user_id`.
    await Promise.all(
      SOFT_DELETE_TABLES.map((table) => {
        if (table === "profiles") {
          return admin.from(table).update({ deleted_at: now }).eq("id", uid);
        }
        return admin.from(table).update({ deleted_at: now }).eq("user_id", uid);
      }),
    );

    // Hard-delete configuration / preference tables. These have no
    // restore value — a returning user regenerates them via onboarding.
    await Promise.all(
      HARD_DELETE_TABLES_USER_ID.map((table) =>
        admin.from(table).delete().eq("user_id", uid),
      ),
    );

    // Revoke every Garmin CIQ pairing for this user so the watch can no
    // longer push workouts. The purge job hard-deletes the rows at day
    // 30; setting revoked_at now is what actually cuts the auth off
    // immediately. Matches our Garmin partner commitment (docs/specs/
    // garmin_developer_application_draft.md).
    await admin
      .from("garmin_pairings")
      .update({ revoked_at: now })
      .eq("user_id", uid)
      .is("revoked_at", null);

    // Sign out every session for this user so their existing devices
    // stop being able to hit our RLS-scoped endpoints.
    await admin.auth.admin.signOut(uid, "global");

    return new Response(
      JSON.stringify({
        success: true,
        soft_deleted_tables: SOFT_DELETE_TABLES.length,
        hard_deleted_tables: HARD_DELETE_TABLES_USER_ID.length,
        purge_scheduled_after_days: 30,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[delete-account] failed:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
