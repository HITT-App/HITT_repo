// Run every 5 minutes by pg_cron. Compares each user's next 7 days with what's on Garmin.
// Users marked dirty run first. Everyone else gets a daily pass, which also brings
// far-ahead workouts into the window as their date approaches.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  GarminRetryLater,
  GarminTokenDead,
  getValidAccessToken,
  markNeedsReconnect,
} from "../_shared/garmin-connection.ts";
import { sha256Hex } from "../_shared/garmin-crypto.ts";
import { adminClient } from "../_shared/garmin-http.ts";
import { secretMatches } from "../_shared/garmin-inbox.ts";
import {
  type GarminWorkout,
  type HiitWorkout,
  type Link,
  mapOneOff,
  type MapResult,
  mapWorkout,
  type OneOffPayload,
  planSync,
} from "../_shared/garmin-workout.ts";

const WINDOW_DAYS = 7;
const DAILY_PASS_MS = 24 * 60 * 60 * 1000;
// Starter allows 100 calls a minute per app, including OAuth. Runs are 5 minutes apart.
const CALL_BUDGET = 80;
const MAX_USERS = 25;

const WORKOUT_URL = "https://apis.garmin.com/workoutportal/workout/v2";
const WORKOUT_ITEM_URL = "https://apis.garmin.com/training-api/workout/v2";
const SCHEDULE_URL = "https://apis.garmin.com/training-api/schedule";

class RateLimited extends Error {}
class PermissionOff extends Error {}
class TokenRejected extends Error {}
class BudgetSpent extends Error {}
class Rejected extends Error {}

type Budget = { left: number };

async function garmin(token: string, budget: Budget, url: string, method: string, body?: unknown): Promise<Response> {
  if (budget.left <= 0) throw new BudgetSpent();
  budget.left--;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 429) throw new RateLimited();
  if (res.status === 412) throw new PermissionOff();
  if (res.status === 401) throw new TokenRejected();
  if (res.status === 404 && method === "DELETE") return res;
  if (res.status >= 400 && res.status < 500) throw new Rejected(`Garmin rejected this workout (${res.status})`);
  if (!res.ok) throw new GarminRetryLater(`Garmin returned ${res.status}`);
  return res;
}

async function loadDue(admin: SupabaseClient, userId: string, today: string, windowEnd: string) {
  const [scheduled, planItems] = await Promise.all([
    admin.from("scheduled_workouts")
      .select("id, scheduled_date, status, workout_id, workout_title, exercises_snapshot, workouts(title, category)")
      .eq("user_id", userId).gte("scheduled_date", today).lte("scheduled_date", windowEnd),
    admin.from("user_workout_plan_items")
      .select("id, scheduled_date, status, workout_id, workout_title, exercises_snapshot, workouts(title, category)")
      .eq("user_id", userId).gte("scheduled_date", today).lte("scheduled_date", windowEnd),
  ]);
  if (scheduled.error) throw new Error(scheduled.error.message);
  if (planItems.error) throw new Error(planItems.error.message);
  const rows = [...(scheduled.data ?? []), ...(planItems.data ?? [])] as any[];
  return rows.filter(r => r.status !== "completed" && r.status !== "skipped");
}

async function toWorkout(admin: SupabaseClient, row: any, swimDistance: number | null): Promise<HiitWorkout> {
  let exercises = row.exercises_snapshot ?? [];
  if (!exercises.length && row.workout_id) {
    const { data, error } = await admin
      .from("workout_exercises")
      .select("title, duration_seconds, sets, reps, order_index")
      .eq("workout_id", row.workout_id);
    if (error) throw new Error(error.message);
    exercises = data ?? [];
  }
  // The app asks for one distance when a swim had none, so it applies to the first exercise.
  if (swimDistance && exercises.length) {
    exercises = exercises.map((e: any, i: number) => (i === 0 ? { ...e, distance_m: e.distance_m ?? swimDistance } : e));
  }
  return { title: row.workout_title ?? row.workouts?.title ?? null, category: row.workouts?.category ?? null, exercises };
}

async function removeFromGarmin(token: string, budget: Budget, link: { garmin_workout_id: number | null; garmin_schedule_id: number | null }) {
  if (link.garmin_schedule_id) await garmin(token, budget, `${SCHEDULE_URL}/${link.garmin_schedule_id}`, "DELETE");
  if (link.garmin_workout_id) await garmin(token, budget, `${WORKOUT_ITEM_URL}/${link.garmin_workout_id}`, "DELETE");
}

async function sendToGarmin(token: string, budget: Budget, workout: GarminWorkout, date: string) {
  const created = await (await garmin(token, budget, WORKOUT_URL, "POST", workout)).json() as { workoutId: number };
  // If scheduling fails the workout is removed again, so it can't be left orphaned at Garmin.
  try {
    const scheduled = await garmin(token, budget, `${SCHEDULE_URL}/`, "POST", { workoutId: created.workoutId, date });
    const body = await scheduled.json().catch(() => null) as { scheduleId?: number } | number | null;
    const scheduleId = typeof body === "number" ? body : body?.scheduleId ?? null;
    return { garmin_workout_id: created.workoutId, garmin_schedule_id: scheduleId };
  } catch (e) {
    await garmin(token, { left: 1 }, `${WORKOUT_ITEM_URL}/${created.workoutId}`, "DELETE").catch(() => {});
    throw e;
  }
}

async function syncUser(admin: SupabaseClient, userId: string, budget: Budget): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const windowEnd = new Date(Date.now() + (WINDOW_DAYS - 1) * DAILY_PASS_MS).toISOString().slice(0, 10);

  const { data: linkRows, error } = await admin.from("garmin_workout_links").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const swimDistances = new Map((linkRows ?? []).map(l => [l.scheduled_workout_id, l.swim_distance_m as number | null]));

  const rows = await loadDue(admin, userId, today, windowEnd);
  const { data: oneOffs, error: oneOffError } = await admin
    .from("garmin_one_off_workouts")
    .select("id, workout_date, payload")
    .eq("user_id", userId)
    .gte("workout_date", today)
    .lte("workout_date", windowEnd);
  if (oneOffError) throw new Error(oneOffError.message);

  const prepare = async (id: string, date: string, mapped: MapResult) => ({
    id,
    date,
    mapped,
    hash: await sha256Hex(JSON.stringify({ mapped, date })),
  });
  const prepared = await Promise.all([
    ...rows.map(async row =>
      prepare(row.id, row.scheduled_date, mapWorkout(await toWorkout(admin, row, swimDistances.get(row.id) ?? null)))
    ),
    ...(oneOffs ?? []).map(o => prepare(o.id, o.workout_date, mapOneOff(o.payload as OneOffPayload))),
  ]);

  const ids = (linkRows ?? []).map(l => l.scheduled_workout_id);
  const dates = new Map<string, string>();
  if (ids.length) {
    for (const table of ["scheduled_workouts", "user_workout_plan_items"]) {
      const { data, error: rowsError } = await admin.from(table).select("id, scheduled_date").in("id", ids);
      if (rowsError) throw new Error(rowsError.message);
      for (const r of data ?? []) dates.set(r.id, r.scheduled_date);
    }
    const { data: oneOffDates, error: datesError } = await admin
      .from("garmin_one_off_workouts")
      .select("id, workout_date")
      .in("id", ids);
    if (datesError) throw new Error(datesError.message);
    for (const o of oneOffDates ?? []) dates.set(o.id, o.workout_date);
  }
  const links: Link[] = (linkRows ?? []).map(l => ({
    id: l.scheduled_workout_id,
    hash: l.content_hash,
    hasRow: dates.has(l.scheduled_workout_id),
    date: dates.get(l.scheduled_workout_id) ?? null,
    garminWorkoutId: l.garmin_workout_id,
  }));
  const linkById = new Map((linkRows ?? []).map(l => [l.scheduled_workout_id, l]));
  const plan = planSync(prepared, links, windowEnd);
  const token = await getValidAccessToken(admin, userId);

  for (const link of plan.remove) {
    await removeFromGarmin(token, budget, linkById.get(link.id)!);
    await admin.from("garmin_workout_links").delete().eq("scheduled_workout_id", link.id);
  }

  for (const due of [...plan.create, ...plan.replace]) {
    const item = prepared.find(p => p.id === due.id)!;
    const existing = linkById.get(due.id);
    const base = { scheduled_workout_id: due.id, user_id: userId, content_hash: due.hash, updated_at: new Date().toISOString() };

    if (existing) await removeFromGarmin(token, budget, existing);

    if (!item.mapped.ok) {
      await admin.from("garmin_workout_links").upsert({
        ...base, garmin_workout_id: null, garmin_schedule_id: null, sync_status: item.mapped.reason, last_error: null,
      });
      continue;
    }

    try {
      const sent = await sendToGarmin(token, budget, item.mapped.workout, due.date);
      await admin.from("garmin_workout_links").upsert({
        ...base, ...sent, sync_status: "sent", last_error: null, garmin_sport: item.mapped.workout.sport,
      });
      await admin.from("garmin_connections").update({ last_workout_pushed_at: new Date().toISOString() }).eq("user_id", userId);
    } catch (e) {
      if (e instanceof Rejected) {
        // The hash is kept, so it isn't resent until the workout changes or the user taps Retry.
        await admin.from("garmin_workout_links").upsert({
          ...base, garmin_workout_id: null, garmin_schedule_id: null, sync_status: "failed", last_error: e.message,
        });
      } else {
        await admin.from("garmin_workout_links").upsert({
          ...base, content_hash: null, garmin_workout_id: null, garmin_schedule_id: null,
          sync_status: "failed", last_error: "Couldn't reach Garmin. We'll keep trying.",
        });
        throw e;
      }
    }
  }
}

serve(async (req) => {
  const secret = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
  if (!secretMatches(secret, Deno.env.get("GARMIN_CRON_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // A user id means one workout was just sent, so only that user is synced now.
  const onlyUser = ((await req.json().catch(() => ({}))) as { user_id?: string }).user_id;
  const admin = adminClient();
  const dirtyQuery = admin
    .from("garmin_sync_dirty")
    .select("user_id, marked_at")
    .order("marked_at")
    .limit(MAX_USERS);
  const { data: dirty, error } = await (onlyUser ? dirtyQuery.eq("user_id", onlyUser) : dirtyQuery);
  if (error) {
    console.error("[garmin-sync-workouts]", error.message);
    return new Response("Failed", { status: 500 });
  }

  const dailyBefore = new Date(Date.now() - DAILY_PASS_MS).toISOString();
  const { data: stale } = onlyUser ? { data: [] } : await admin
    .from("garmin_connections")
    .select("user_id")
    .eq("status", "active")
    .not("workout_import_consented_at", "is", null)
    .or(`last_workout_sync_at.is.null,last_workout_sync_at.lt.${dailyBefore}`)
    .limit(MAX_USERS);

  const queue = [...new Set([...(dirty ?? []).map(d => d.user_id), ...(stale ?? []).map(s => s.user_id)])];
  const markedAt = new Map((dirty ?? []).map(d => [d.user_id, d.marked_at]));
  const budget: Budget = { left: CALL_BUDGET };
  let synced = 0;

  for (const userId of queue) {
    const { data: conn } = await admin
      .from("garmin_connections")
      .select("status, permissions, workout_import_consented_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn || conn.status !== "active" || !conn.workout_import_consented_at || !conn.permissions.includes("WORKOUT_IMPORT")) {
      await admin.from("garmin_sync_dirty").delete().eq("user_id", userId);
      continue;
    }

    // Taking the row is the lock: a send and the 5-minute run could otherwise both create the same workout.
    if (markedAt.has(userId)) {
      const { data: claimed } = await admin.from("garmin_sync_dirty").delete().eq("user_id", userId).select("user_id");
      if (!claimed?.length) continue;
    }

    try {
      await syncUser(admin, userId, budget);
      await admin.from("garmin_connections").update({ last_workout_sync_at: new Date().toISOString() }).eq("user_id", userId);
      synced++;
    } catch (e) {
      // The row was taken above, so put it back or this user waits for the daily pass.
      if (markedAt.has(userId) && !(e instanceof PermissionOff || e instanceof TokenRejected || e instanceof GarminTokenDead)) {
        await admin.from("garmin_sync_dirty").upsert({ user_id: userId, marked_at: markedAt.get(userId)! });
      }
      if (e instanceof RateLimited || e instanceof BudgetSpent) break;
      if (e instanceof PermissionOff) {
        await admin.from("garmin_connections").update({ status: "permission_off" }).eq("user_id", userId);
      } else if (e instanceof TokenRejected || e instanceof GarminTokenDead) {
        await markNeedsReconnect(admin, userId);
      } else {
        console.error("[garmin-sync-workouts] user failed:", (e as Error).name);
      }
    }
  }

  return new Response(JSON.stringify({ synced, callsLeft: budget.left }), { headers: { "Content-Type": "application/json" } });
});
