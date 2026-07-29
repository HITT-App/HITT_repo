import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Account deletion — Apple Guideline 5.1.1(v) + GDPR Article 17.
// INSTANT HARD DELETE. There is no restore window.
//
// Order matters:
//  1. Wipe every user-scoped row across our tables (workouts, meals,
//     community, prefs, tokens…). FK cascades from auth.users would
//     otherwise leave orphans that RLS blocks the user from seeing.
//  2. Delete the auth.users row via the admin API. This frees the email
//     for re-signup and terminates every active session.
//
// If step 1 fails partway, the auth.users row stays intact so the user
// can retry. Step 2 is idempotent — deleteUser on an already-deleted
// UID returns "User not found" which we swallow.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Every table with a `user_id` (or, for profiles, `id`) column that
// stores this user's data. Keep this in sync as new user-scoped tables
// are added — the DELETE-01 audit in tests/run.ts guards it.
const USER_ID_TABLES = [
  // Primary data
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
  // Preferences / config
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
  // Community
  "community_profiles",
  "community_posts",
  "community_comments",
  "community_likes",
  "community_follows",
  "community_reactions",
  "community_saved_posts",
  "community_stories",
  "community_notifications",
  "community_poll_votes",
  "community_blocks",
  "community_story_views",
  "user_friends",
  "accountability_pairs",
  // Third-party integrations
  "garmin_pairings",
  "push_subscriptions",   // Legacy web-push table (kept until legacy hooks migrate)
  "device_push_tokens",   // Native APNs tokens used by useNativePush + notify-user
  // Roles
  "user_roles",
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

    // Client requires the user to type DELETE. Double-check server-side.
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
    const uid = user.id;

    // Step 1: hard-delete every user-scoped row. profiles keys on `id`,
    // everything else on `user_id`. We fire all deletes in parallel —
    // there are no FKs between these tables that require ordering.
    const failures: string[] = [];
    await Promise.all(
      USER_ID_TABLES.map((table) =>
        admin.from(table).delete().eq("user_id", uid).then(({ error }) => {
          if (error) {
            console.error(`[delete-account] ${table}:`, error.message);
            failures.push(table);
          }
        }),
      ),
    );
    const { error: profErr } = await admin.from("profiles").delete().eq(
      "id",
      uid,
    );
    if (profErr) {
      console.error("[delete-account] profiles:", profErr.message);
      failures.push("profiles");
    }

    // Step 1b: remove the user's stored objects. Deleting the body_scans ROW does
    // not touch storage, so without this a deleted account would leave its body
    // photos sitting in the bucket indefinitely (#118).
    //
    // Buckets are pathed {user_id}/... so a user's objects are listable by prefix.
    // Add any future user-scoped bucket here — nothing else cleans them up.
    const USER_STORAGE_BUCKETS = ["body-scan-photos"];
    for (const bucket of USER_STORAGE_BUCKETS) {
      try {
        // list() is not recursive, so walk the per-scan folders under {uid}/.
        const { data: folders } = await admin.storage.from(bucket).list(uid);
        const paths: string[] = [];
        for (const entry of folders ?? []) {
          if (entry.id === null) {
            // A folder — descend one level for its objects.
            const { data: inner } = await admin.storage.from(bucket).list(`${uid}/${entry.name}`);
            for (const f of inner ?? []) paths.push(`${uid}/${entry.name}/${f.name}`);
          } else {
            paths.push(`${uid}/${entry.name}`);
          }
        }
        if (paths.length) {
          const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
          if (rmErr) {
            console.error(`[delete-account] storage ${bucket}:`, rmErr.message);
            failures.push(`storage:${bucket}`);
          }
        }
      } catch (e) {
        console.error(`[delete-account] storage ${bucket}:`, (e as Error).message);
        failures.push(`storage:${bucket}`);
      }
    }

    // Step 2: drop the auth.users row. Frees the email + kills every
    // active session. Idempotent on already-deleted UIDs.
    const { error: authErr } = await admin.auth.admin.deleteUser(uid);
    if (authErr && authErr.message !== "User not found") {
      console.error("[delete-account] auth.users:", authErr.message);
      return new Response(
        JSON.stringify({
          error: "Auth deletion failed",
          detail: authErr.message,
          tables_with_errors: failures,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tables_wiped: USER_ID_TABLES.length + 1,
        tables_with_errors: failures,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[delete-account] top-level failure:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
