// Shared activity upsert used by every ingest path:
//   - log-watch-workout           (Watch → iPhone → server, WCSession)
//   - sync-healthkit              (foreground HealthKit aggregator)
//   - push-garmin-watch-workout   (Garmin CIQ app → server, direct HTTP)
//
// Three dedupe layers:
//
//   1. Exact-key dedupe on (user_id, source_platform, source_platform_id)
//      — the DB partial unique index catches identical re-sends from the
//      same source.
//
//   2. Fingerprint dedupe on (user_id, fingerprint_hash) — SHA-256 of
//      user_id | canonical_activity_type | floor(epoch/60) | floor(duration/30).
//      Coarse enough that two vendors reporting the same real workout
//      collide, fine enough that adjacent workouts don't.
//
//   3. Fuzzy-window dedupe: for each incoming row, we query the DB for
//      any existing row with the same user_id + canonical activity_type
//      whose start_time is within ±FUZZY_MATCH_WINDOW_SECONDS. This
//      catches the boundary case where two sources put the same workout
//      into adjacent minute-buckets (fingerprint layer misses it). Slower
//      than pure fingerprint dedupe, but bounded — the query hits the
//      partial index on (user_id, started_at).
//
// Winner selection: when a fuzzy match exists AND the incoming row's
// source_platform has strictly higher priority (see activity-types.ts),
// we UPDATE the existing row's source_platform / source_platform_id and
// merge non-null fields. Otherwise the incoming row is skipped and the
// existing row wins. This is how our direct-push CIQ path takes over from
// a HealthKit-mediated garmin row once the watch pushes directly.
//
// Every activity_type value is normalised via normaliseActivityType()
// BEFORE the fingerprint is computed — otherwise "run" and "running" from
// different paths would hash to different fingerprints and dedupe fails
// silently. Do not bypass the normaliser.

import {
  normaliseActivityType,
  sourcePriority,
  FUZZY_MATCH_WINDOW_SECONDS,
  CanonicalActivityType,
} from "./activity-types.ts";

export interface ActivityRow {
  user_id: string;
  activity_type: string;
  started_at: string;          // ISO
  ended_at?: string | null;    // ISO
  duration_seconds: number;
  calories_burned?: number | null;
  avg_heart_rate?: number | null;
  distance_km?: number | null;
  source_platform: string;
  source_platform_id: string;
  status?: string;
}

interface StampedRow extends ActivityRow {
  activity_type: CanonicalActivityType;
  fingerprint_hash: string;
  status: string;
}

interface ExistingRow {
  id: string;
  user_id: string;
  activity_type: string;
  started_at: string;
  duration_seconds: number;
  source_platform: string;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  distance_km: number | null;
}

export async function activityFingerprint(
  row: Pick<ActivityRow, "user_id" | "activity_type" | "started_at" | "duration_seconds">
): Promise<string> {
  const canonical = normaliseActivityType(row.activity_type);
  const epochMin = Math.floor(new Date(row.started_at).getTime() / 1000 / 60);
  const durBucket = Math.floor((row.duration_seconds ?? 0) / 30);
  const input = `${row.user_id}|${canonical}|${epochMin}|${durBucket}`;
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface InsertedSummary {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  calories_burned?: number | null;
  source_platform: string;
}

export interface UpsertResult {
  inserted: number;
  skipped: number;
  upgraded: number;             // rows where a lower-priority existing row was replaced
  insertedRows?: InsertedSummary[];
}

export async function upsertActivities(admin: any, rows: ActivityRow[]): Promise<UpsertResult> {
  if (!rows.length) return { inserted: 0, skipped: 0, upgraded: 0 };

  // 1. Normalise activity_type + compute fingerprint.
  const stamped: StampedRow[] = await Promise.all(
    rows.map(async r => ({
      ...r,
      activity_type: normaliseActivityType(r.activity_type),
      status: r.status ?? "completed",
      fingerprint_hash: await activityFingerprint(r),
    }))
  );

  // 2. Pull EVERY existing row per user that could conflict — bounded by
  //    the earliest incoming started_at minus the fuzzy window and the
  //    latest incoming started_at plus the window. This one bulk read
  //    covers all three dedupe layers below.
  const userIds = [...new Set(stamped.map(r => r.user_id))];
  const startTimes = stamped.map(r => new Date(r.started_at).getTime());
  const minStart = new Date(Math.min(...startTimes) - FUZZY_MATCH_WINDOW_SECONDS * 1000).toISOString();
  const maxStart = new Date(Math.max(...startTimes) + FUZZY_MATCH_WINDOW_SECONDS * 1000).toISOString();

  const { data: existingRaw } = await admin
    .from("activity_logs")
    .select("id, user_id, activity_type, started_at, duration_seconds, source_platform, calories_burned, avg_heart_rate, distance_km, fingerprint_hash")
    .in("user_id", userIds)
    .gte("started_at", minStart)
    .lte("started_at", maxStart);
  const existing: (ExistingRow & { fingerprint_hash: string })[] = existingRaw ?? [];

  // Index by user for fast lookup during per-row classification.
  const existingByUser = new Map<string, typeof existing>();
  for (const e of existing) {
    const list = existingByUser.get(e.user_id) ?? [];
    list.push(e);
    existingByUser.set(e.user_id, list);
  }

  const toInsert: StampedRow[] = [];
  const toUpgrade: Array<{ existingId: string; row: StampedRow }> = [];
  let skipped = 0;

  for (const r of stamped) {
    const rStart = new Date(r.started_at).getTime();
    const candidates = existingByUser.get(r.user_id) ?? [];

    // Fingerprint match OR fuzzy window match on same canonical activity_type.
    const match = candidates.find(e => {
      if (e.fingerprint_hash === r.fingerprint_hash) return true;
      if (normaliseActivityType(e.activity_type) !== r.activity_type) return false;
      const drift = Math.abs(new Date(e.started_at).getTime() - rStart);
      return drift <= FUZZY_MATCH_WINDOW_SECONDS * 1000;
    });

    if (!match) {
      toInsert.push(r);
      continue;
    }

    // A row is already in the DB for this workout. Winner-selection:
    // upgrade only if the incoming source is strictly higher priority.
    if (sourcePriority(r.source_platform) > sourcePriority(match.source_platform)) {
      toUpgrade.push({ existingId: match.id, row: r });
    } else {
      skipped++;
    }
  }

  // 3. Apply upgrades. Merge non-null incoming fields into the existing row
  //    and swap the source_platform. `calories_burned`, `avg_heart_rate`,
  //    `distance_km` from the incoming payload only overwrite if non-null
  //    (we don't want a scant direct-push payload to blank out richer
  //    HealthKit data).
  let upgraded = 0;
  for (const { existingId, row } of toUpgrade) {
    const patch: Record<string, unknown> = {
      source_platform: row.source_platform,
      source_platform_id: row.source_platform_id,
      activity_type: row.activity_type,
      started_at: row.started_at,
      duration_seconds: row.duration_seconds,
      fingerprint_hash: row.fingerprint_hash,
    };
    if (row.ended_at !== undefined && row.ended_at !== null) patch.ended_at = row.ended_at;
    if (row.calories_burned != null) patch.calories_burned = row.calories_burned;
    if (row.avg_heart_rate != null) patch.avg_heart_rate = row.avg_heart_rate;
    if (row.distance_km != null) patch.distance_km = row.distance_km;

    const { error } = await admin
      .from("activity_logs")
      .update(patch)
      .eq("id", existingId);
    if (error) {
      console.warn("[activity-upsert] upgrade skipped:", error.message);
      skipped++;
    } else {
      upgraded++;
    }
  }

  // 4. Insert fresh rows. Same-source dedupe still handled by the partial
  //    unique index — any re-send from the same (source_platform,
  //    source_platform_id) is silently dropped via ON CONFLICT DO NOTHING.
  if (!toInsert.length) {
    return { inserted: 0, skipped, upgraded };
  }

  const { data: insertedData, error } = await admin
    .from("activity_logs")
    .upsert(toInsert, {
      onConflict: "user_id, source_platform, source_platform_id",
      ignoreDuplicates: true,
    })
    .select("id, activity_type, started_at, ended_at, duration_seconds, calories_burned, source_platform");

  if (error) {
    console.error("[activity-upsert] insert error:", JSON.stringify({
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    }));
    throw new Error(`upsert failed: ${error.message ?? "unknown"} (${error.code ?? "?"})`);
  }

  const insertedRows = (insertedData ?? []) as InsertedSummary[];
  return {
    inserted: insertedRows.length,
    skipped: skipped + (toInsert.length - insertedRows.length),
    upgraded,
    insertedRows,
  };
}
