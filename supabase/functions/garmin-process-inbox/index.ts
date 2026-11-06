// Run each minute by pg_cron. Every handler is safe to run twice for the same push.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { activityFingerprint, upsertActivities } from "../_shared/activity-upsert.ts";
import { adminClient } from "../_shared/garmin-http.ts";
import { matchSentWorkout, type TickCandidate } from "../_shared/garmin-workout.ts";
import { normaliseActivityType } from "../_shared/activity-types.ts";
import {
  type GarminBodyComp,
  type GarminDaily,
  type GarminHrv,
  type GarminSleep,
  type GarminStressDetail,
  type GarminUserMetrics,
  mapBodyComp,
  lastPerSourceId,
  mapDaily,
  mapHrv,
  mapSleep,
  mapSleepScore,
  mapStressDetail,
  mapUserMetrics,
  type MetricRow,
} from "../_shared/garmin-health.ts";
import {
  type GarminActivityDetail,
  type GarminActivitySummary,
  isStalePermissionChange,
  manualUpdatePatch,
  mapActivityDetail,
  mapGarminActivity,
  type PermissionsChange,
  secretMatches,
  statusForPermissions,
} from "../_shared/garmin-inbox.ts";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const LEASE_SECONDS = 300;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const BACKLOG_ALERT = 500;

// Unknown users and users with sharing off are dropped without an error, so Garmin
// doesn't retry for a week.
async function usersWithPermission(
  admin: SupabaseClient,
  items: { userId?: string }[],
  permission: "ACTIVITY_EXPORT" | "HEALTH_EXPORT",
): Promise<Map<string, string>> {
  const garminIds = [...new Set(items.map(s => s.userId).filter(Boolean))] as string[];
  if (!garminIds.length) return new Map();

  const { data: connections, error } = await admin
    .from("garmin_connections")
    .select("user_id, garmin_user_id, permissions, status")
    .in("garmin_user_id", garminIds)
    .neq("status", "disconnected");
  if (error) throw new Error(error.message);

  return new Map(
    (connections ?? [])
      .filter(c => c.status !== "permission_off" && c.permissions.includes(permission))
      .map(c => [c.garmin_user_id, c.user_id]),
  );
}

async function handleActivities(admin: SupabaseClient, summaries: GarminActivitySummary[]) {
  const allowed = await usersWithPermission(admin, summaries, "ACTIVITY_EXPORT");
  const rows = summaries.flatMap(s => {
    const userId = s.userId ? allowed.get(s.userId) : undefined;
    const row = userId ? mapGarminActivity(s, userId) : null;
    return row ? [row] : [];
  });
  if (!rows.length) return;

  await upsertActivities(admin, rows);
  await admin
    .from("garmin_connections")
    .update({ last_activity_at: new Date().toISOString() })
    .in("user_id", [...new Set(rows.map(r => r.user_id))]);

  for (const summary of summaries) {
    const userId = summary.userId ? allowed.get(summary.userId) : undefined;
    const row = userId ? mapGarminActivity(summary, userId) : null;
    if (userId && row) await tickOffPlan(admin, userId, row, summary);
  }
}

// Marks the plan row done when a workout we sent comes back from the watch.
async function tickOffPlan(
  admin: SupabaseClient,
  userId: string,
  row: NonNullable<ReturnType<typeof mapGarminActivity>>,
  summary: GarminActivitySummary,
) {
  const activityId = row.garmin_activity_id!;
  const { data: already } = await admin
    .from("garmin_workout_links")
    .select("scheduled_workout_id")
    .eq("user_id", userId)
    .eq("completed_activity_id", activityId)
    .limit(1);
  // Garmin can resend an activity, and it must not tick a second workout.
  if (already?.length) return;

  const { data: links, error } = await admin
    .from("garmin_workout_links")
    .select("scheduled_workout_id, garmin_sport")
    .eq("user_id", userId)
    .eq("sync_status", "sent")
    .is("completed_activity_id", null);
  if (error) throw new Error(error.message);
  const ids = (links ?? []).map(l => l.scheduled_workout_id);
  if (!ids.length) return;

  const sports = new Map((links ?? []).map(l => [l.scheduled_workout_id, l.garmin_sport as string | null]));
  const candidates: (TickCandidate & { table: string })[] = [];
  for (const table of ["scheduled_workouts", "user_workout_plan_items"]) {
    const { data, error: rowsError } = await admin
      .from(table)
      .select("id, scheduled_date, status")
      .in("id", ids)
      .order("scheduled_date");
    if (rowsError) throw new Error(rowsError.message);
    for (const r of data ?? []) {
      if (r.status === "completed") continue;
      candidates.push({ id: r.id, date: r.scheduled_date, sport: sports.get(r.id) ?? null, table });
    }
  }

  // Garmin's offset gives the date on the user's watch, which is the day they planned it for.
  const localMs = ((summary.startTimeInSeconds ?? 0) + (summary.startTimeOffsetInSeconds ?? 0)) * 1000;
  const matchId = matchSentWorkout({
    activity_type: normaliseActivityType(row.activity_type),
    localDate: new Date(localMs).toISOString().slice(0, 10),
    durationSeconds: row.duration_seconds,
  }, candidates);
  if (!matchId) return;

  const table = candidates.find(c => c.id === matchId)!.table;
  const fields: Record<string, unknown> = { status: "completed", completed_at: row.ended_at, completed_via_garmin: true };
  if (table === "scheduled_workouts") {
    fields.duration_minutes = Math.round(row.duration_seconds / 60);
    fields.calories_burned = row.calories_burned;
  }
  const { error: tickError } = await admin.from(table).update(fields).eq("id", matchId);
  if (tickError) throw new Error(tickError.message);
  const { error: linkError } = await admin
    .from("garmin_workout_links")
    .update({ completed_activity_id: activityId })
    .eq("scheduled_workout_id", matchId);
  if (linkError) throw new Error(linkError.message);
}

async function handleActivityDetails(admin: SupabaseClient, details: GarminActivityDetail[]) {
  const allowed = await usersWithPermission(admin, details, "ACTIVITY_EXPORT");
  for (const detail of details) {
    const userId = detail.userId ? allowed.get(detail.userId) : undefined;
    const row = userId ? mapActivityDetail(detail, userId) : null;
    if (!row) continue;
    const { error } = await admin.from("garmin_activity_details").upsert(row);
    if (error) throw new Error(error.message);
  }
}

// Garmin's edits don't list an activityId, so they match on summaryId. Only rows Garmin
// owns are changed: a workout from HIIT's own watch app keeps its recorded values.
async function handleManualUpdates(admin: SupabaseClient, summaries: GarminActivitySummary[]) {
  const allowed = await usersWithPermission(admin, summaries, "ACTIVITY_EXPORT");
  for (const summary of summaries) {
    const userId = summary.userId ? allowed.get(summary.userId) : undefined;
    const row = userId ? mapGarminActivity(summary, userId) : null;
    if (!row || !userId || !summary.summaryId) continue;

    const { data: existing, error } = await admin
      .from("activity_logs")
      .select("id, source_platform")
      .eq("user_id", userId)
      .or(`garmin_summary_id.eq.${JSON.stringify(summary.summaryId)},garmin_activity_id.eq.${JSON.stringify(summary.summaryId)}`)
      .limit(1);
    if (error) throw new Error(error.message);

    if (!existing?.length) {
      await upsertActivities(admin, [row]);
    } else if (existing[0].source_platform === "garmin_api") {
      const { error: updateError } = await admin.from("activity_logs").update({
        ...manualUpdatePatch(row),
        fingerprint_hash: await activityFingerprint(row),
      }).eq("id", existing[0].id);
      if (updateError) throw new Error(updateError.message);
    }
  }
}

const SOURCE_KEY = "user_id, source_platform, source_platform_id";

// The inbox records the error name only, so the Postgres code goes there to make failures traceable.
function dbError(error: { message: string; code?: string }): Error {
  const e = new Error(error.message);
  e.name = `db_${error.code ?? "unknown"}`;
  return e;
}

async function saveMetrics<T extends { userId?: string }>(
  admin: SupabaseClient,
  items: T[],
  map: (item: T, userId: string) => MetricRow[],
) {
  const allowed = await usersWithPermission(admin, items, "HEALTH_EXPORT");
  const rows = items.flatMap(item => {
    const userId = item.userId ? allowed.get(item.userId) : undefined;
    return userId ? map(item, userId) : [];
  });
  if (!rows.length) return;
  // A later summary for the same period must replace the earlier one.
  const { error } = await admin.from("health_metrics").upsert(lastPerSourceId(rows), { onConflict: SOURCE_KEY });
  if (error) throw dbError(error);
}

async function handleSleeps(admin: SupabaseClient, sleeps: GarminSleep[]) {
  const allowed = await usersWithPermission(admin, sleeps, "HEALTH_EXPORT");
  const rows = sleeps.flatMap(sleep => {
    const userId = sleep.userId ? allowed.get(sleep.userId) : undefined;
    const row = userId ? mapSleep(sleep, userId) : null;
    return row ? [row] : [];
  });
  if (rows.length) {
    const { error } = await admin.from("sleep_logs").upsert(lastPerSourceId(rows), { onConflict: SOURCE_KEY });
    if (error) throw dbError(error);
  }
  await saveMetrics(admin, sleeps, mapSleepScore);
}

async function handleDeregistrations(admin: SupabaseClient, items: { userId?: string }[]) {
  for (const { userId } of items) {
    if (!userId) continue;
    const { data: disconnected, error } = await admin
      .from("garmin_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        disconnect_reason: "garmin_connect",
      })
      .eq("garmin_user_id", userId)
      .neq("status", "disconnected")
      .select("user_id");
    if (error) throw new Error(error.message);
    for (const row of disconnected ?? []) {
      await admin.from("garmin_tokens").delete().eq("user_id", row.user_id);
    }
  }
}

async function handlePermissions(admin: SupabaseClient, changes: PermissionsChange[]) {
  for (const change of changes) {
    if (!change.userId) continue;
    const { data: conn } = await admin
      .from("garmin_connections")
      .select("user_id, status, permissions_changed_at")
      .eq("garmin_user_id", change.userId)
      .neq("status", "disconnected")
      .maybeSingle();
    if (!conn || isStalePermissionChange(change.changeTimeInSeconds, conn.permissions_changed_at)) continue;

    const permissions = change.permissions ?? [];
    const { error } = await admin.from("garmin_connections").update({
      permissions,
      permissions_changed_at: change.changeTimeInSeconds ?? null,
      status: statusForPermissions(permissions, conn.status),
    }).eq("user_id", conn.user_id);
    if (error) throw new Error(error.message);
  }
}

async function processPush(admin: SupabaseClient, rawBody: string): Promise<string> {
  const push = JSON.parse(rawBody) as Record<string, unknown[]>;
  const types = Object.keys(push);
  if (Array.isArray(push.activities)) await handleActivities(admin, push.activities as GarminActivitySummary[]);
  if (Array.isArray(push.activityDetails)) await handleActivityDetails(admin, push.activityDetails as GarminActivityDetail[]);
  if (Array.isArray(push.manuallyUpdatedActivities)) await handleManualUpdates(admin, push.manuallyUpdatedActivities as GarminActivitySummary[]);
  if (Array.isArray(push.dailies)) await saveMetrics(admin, push.dailies as GarminDaily[], mapDaily);
  if (Array.isArray(push.stressDetails)) await saveMetrics(admin, push.stressDetails as GarminStressDetail[], mapStressDetail);
  if (Array.isArray(push.bodyComps)) await saveMetrics(admin, push.bodyComps as GarminBodyComp[], mapBodyComp);
  if (Array.isArray(push.userMetrics)) await saveMetrics(admin, push.userMetrics as GarminUserMetrics[], mapUserMetrics);
  if (Array.isArray(push.hrv)) await saveMetrics(admin, push.hrv as GarminHrv[], mapHrv);
  if (Array.isArray(push.sleeps)) await handleSleeps(admin, push.sleeps as GarminSleep[]);
  if (Array.isArray(push.deregistrations)) await handleDeregistrations(admin, push.deregistrations as { userId?: string }[]);
  if (Array.isArray(push.userPermissionsChange)) await handlePermissions(admin, push.userPermissionsChange as PermissionsChange[]);
  return types.join(",");
}

serve(async (req) => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
  if (!secretMatches(token, Deno.env.get("GARMIN_CRON_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = adminClient();
  const { data: batch, error } = await admin.rpc("claim_garmin_inbox", {
    batch_size: BATCH_SIZE,
    max_attempts: MAX_ATTEMPTS,
    lease_seconds: LEASE_SECONDS,
  });
  if (error) {
    console.error("[garmin-process-inbox] claim failed:", error.message);
    return new Response("Claim failed", { status: 500 });
  }

  let processed = 0;
  let failed = 0;
  for (const item of batch ?? []) {
    try {
      const summaryType = await processPush(admin, item.raw_body);
      await admin.from("garmin_webhook_inbox").update({
        processed_at: new Date().toISOString(),
        summary_type: summaryType,
        last_error: null,
      }).eq("id", item.id);
      processed++;
    } catch (e) {
      failed++;
      // The name only: messages from parsing can quote the raw body, which is personal data.
      const name = (e as Error).name;
      await admin.from("garmin_webhook_inbox").update({ last_error: name, claimed_at: null }).eq("id", item.id);
      console.error("[garmin-process-inbox] item failed:", item.id, name);
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  await admin.from("garmin_webhook_inbox").delete().lt("received_at", cutoff);

  const { count } = await admin
    .from("garmin_webhook_inbox")
    .select("id", { count: "exact", head: true })
    .is("processed_at", null);
  if ((count ?? 0) > BACKLOG_ALERT) console.error("[garmin-process-inbox] backlog:", count);

  return new Response(JSON.stringify({ processed, failed }), { headers: { "Content-Type": "application/json" } });
});
