import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Day-30 hard-purge for accounts deleted via `delete-account`.
// Invoked by pg_cron on a daily schedule. For every user whose
// `profiles.deleted_at` is older than 30 days, we hard-delete every
// row across the soft-delete tables and then remove the auth.users
// entry (freeing the email address for re-signup).
//
// Auth: requires a shared secret in the Authorization header. pg_cron
// posts with header `Authorization: Bearer <PURGE_CRON_SECRET>`.

const PURGE_AFTER_DAYS = 30;

// Mirror of delete-account's SOFT_DELETE_TABLES — keep in sync.
const SOFT_DELETE_TABLES = [
  // profiles is purged last, after its dependents, so RLS-scoped
  // integrity checks don't cascade unexpectedly.
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

// Tables that may still hold rows even though delete-account tried to
// hard-delete them — belt & braces for accounts deleted before the
// extended cascade shipped.
const LEGACY_HARD_DELETE_TABLES = [
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
  // Garmin pairings — revoked_at was set at delete-account time; the
  // row itself gets removed here.
  "garmin_pairings",
];

serve(async (req) => {
  try {
    const secret = Deno.env.get("PURGE_CRON_SECRET");
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(
      Date.now() - PURGE_AFTER_DAYS * 86_400_000,
    ).toISOString();

    // Find every user whose profile was soft-deleted more than 30 days
    // ago. Cap at 500 per run — pg_cron re-invokes daily and this bounds
    // worst-case work per invocation.
    const { data: candidates, error: listErr } = await admin
      .from("profiles")
      .select("id")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .limit(500);

    if (listErr) {
      console.error("[purge] list candidates failed:", listErr);
      return new Response(JSON.stringify({ error: listErr.message }), {
        status: 500,
      });
    }
    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ purged_users: 0, cutoff }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    let purgedCount = 0;
    const failures: Array<{ uid: string; reason: string }> = [];

    for (const { id: uid } of candidates) {
      try {
        // Wipe every user-owned row across primary-data + legacy config
        // tables. Any FK cascades cover themselves.
        await Promise.all(
          [...SOFT_DELETE_TABLES, ...LEGACY_HARD_DELETE_TABLES].map((table) =>
            admin.from(table).delete().eq("user_id", uid),
          ),
        );

        // profiles keyed on `id`, drop last so any FK-driven dependents
        // resolve first.
        await admin.from("profiles").delete().eq("id", uid);

        // Finally drop the auth.users record so the email frees up and
        // no ghost session data lingers.
        const { error: authErr } = await admin.auth.admin.deleteUser(uid);
        if (authErr && authErr.message !== "User not found") {
          throw authErr;
        }

        purgedCount++;
      } catch (err) {
        console.error(`[purge] user ${uid} failed:`, err);
        failures.push({ uid, reason: (err as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        purged_users: purgedCount,
        candidates: candidates.length,
        failures,
        cutoff,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[purge-deleted-accounts] top-level failure:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
