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
  user_id: string;
  activity_type: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  distance_km?: number | null;
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
  const toEnrich: Array<{ existing: (typeof existing)[number]; row: StampedRow }> = [];
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

    // A row is already in the DB for this workout.
    //
    // Winner-selection:
    //  - Incoming strictly higher priority → full upgrade (swap source
    //    + merge non-null fields into existing).
    //  - Incoming equal or lower priority → enrich only. Keep the
    //    existing source_platform, but fill any NULL calories /
    //    avg_heart_rate / distance_km on the existing row with the
    //    incoming values. Prevents the case where a Garmin CIQ direct
    //    push (highest priority) writes an empty stats row a minute
    //    before HealthKit lands with the real numbers — we used to
    //    skip the second row entirely and leave the composite empty.
    if (sourcePriority(r.source_platform) > sourcePriority(match.source_platform)) {
      toUpgrade.push({ existingId: match.id, row: r });
    } else if (
      (match.calories_burned == null && r.calories_burned != null) ||
      (match.avg_heart_rate == null && r.avg_heart_rate != null) ||
      (match.distance_km == null && r.distance_km != null)
    ) {
      toEnrich.push({ existing: match, row: r });
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

  // 3b. Apply enrichments — same-workout row where the incoming source
  //     is lower/equal priority but has a stat the existing row is
  //     missing (typical: Garmin CIQ direct push arrives with no
  //     calories/distance, HealthKit-mediated 'garmin' lands a minute
  //     later with both). Fill the NULLs, keep everything else — most
  //     importantly, don't swap source_platform back to a lower rank.
  for (const { existing: existingRow, row } of toEnrich) {
    const patch: Record<string, unknown> = {};
    if (existingRow.calories_burned == null && row.calories_burned != null) {
      patch.calories_burned = row.calories_burned;
    }
    if (existingRow.avg_heart_rate == null && row.avg_heart_rate != null) {
      patch.avg_heart_rate = row.avg_heart_rate;
    }
    if (existingRow.distance_km == null && row.distance_km != null) {
      patch.distance_km = row.distance_km;
    }
    if (Object.keys(patch).length === 0) {
      skipped++;
      continue;
    }
    const { error } = await admin
      .from("activity_logs")
      .update(patch)
      .eq("id", existingRow.id);
    if (error) {
      console.warn("[activity-upsert] enrich skipped:", error.message);
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
    .select("id, user_id, activity_type, started_at, ended_at, duration_seconds, distance_km, calories_burned, source_platform");

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

  // ── PB detection + share-reminder scheduling ───────────────────────
  // For every newly-inserted activity row, check whether it's a personal
  // best (longest duration OR greatest distance for that user's history
  // of the same canonical activity_type). If so, drop a workout_progress
  // row so the existing fire_pb_share_reminders_5min cron picks it up
  // and delivers the "🏆 New PB!" push ~5 minutes later.
  //
  // Only runs on GENUINELY new inserts (not on winner-selection upgrades
  // of an existing workout, which would double-fire pushes) — insertedRows
  // is exactly the set of new-in-DB rows.
  //
  // Guards:
  //  - Skip rows shorter than 60 seconds (HealthKit sometimes fragments).
  //  - Skip if the source_platform is our own in-app path (hitt_phone) —
  //    WorkoutPlayer.tsx already handles PB detection client-side and
  //    duplicating here would fire two pushes for the same workout.
  //
  // Failures are logged and swallowed — the upsert itself always returns
  // successfully so an ingest can't be blocked by PB-detection issues.
  for (const row of insertedRows) {
    try {
      await maybeScheduleExternalPBReminder(admin, row);
    } catch (e) {
      console.error("[activity-upsert] PB detection failed:", e);
    }
  }

  return {
    inserted: insertedRows.length,
    skipped: skipped + (toInsert.length - insertedRows.length),
    upgraded,
    insertedRows,
  };
}

// ── PB helpers ────────────────────────────────────────────────────────

// Human-facing title mapping for canonical activity types. Keeps the push
// body ("Your XXX was a personal best") readable — "Your Cycling ride was
// …" beats "Your cycling was …".
const PB_TITLES: Record<string, string> = {
  running: "Run",
  walking: "Walk",
  hiking: "Hike",
  cycling: "Cycling ride",
  swimming: "Swim",
  rowing: "Row",
  hiit: "HIIT session",
  strength: "Strength session",
  pilates: "Pilates session",
  yoga: "Yoga session",
  cross_training: "Cross-training session",
  elliptical: "Elliptical session",
  stairs: "Stair session",
  triathlon: "Triathlon",
  other: "Workout",
};

async function maybeScheduleExternalPBReminder(
  admin: any,
  row: InsertedSummary,
): Promise<void> {
  // Guard: too short — likely fragmented HealthKit sample.
  if (!row.duration_seconds || row.duration_seconds < 60) return;

  // Guard: our own in-app path handles PBs client-side (WorkoutPlayer.tsx).
  // Duplicating server-side would fire two pushes for the same workout.
  if (row.source_platform === "hitt_phone") return;

  const canonicalType = normaliseActivityType(row.activity_type);
  const newDuration = row.duration_seconds;
  const newDistance = row.distance_km ?? 0;

  // Fetch prior duration + distance samples for this user × canonical
  // type, EXCLUDING this row. Limit 200 is generous — a user with more
  // than 200 prior activities of the SAME type is unusual and 200 is
  // still enough to compute the correct max.
  const { data: userPrior } = await admin
    .from("activity_logs")
    .select("duration_seconds, distance_km")
    .eq("user_id", row.user_id)
    .eq("activity_type", row.activity_type)
    .neq("id", row.id)
    .limit(200);

  const prior = (userPrior ?? []) as Array<{ duration_seconds: number | null; distance_km: number | null }>;

  // If there's no prior activity of this type, first one doesn't count
  // as a PB (nothing to beat) — otherwise every fresh user would get
  // one push per activity type on day one.
  if (prior.length === 0) return;

  const prevMaxDuration = prior.reduce((m, r) => Math.max(m, r.duration_seconds ?? 0), 0);
  const prevMaxDistance = prior.reduce((m, r) => Math.max(m, r.distance_km ?? 0), 0);

  const isDurationPB = newDuration > prevMaxDuration;
  const isDistancePB = newDistance > 0 && newDistance > prevMaxDistance;

  if (!isDurationPB && !isDistancePB) return;

  const title = PB_TITLES[canonicalType] ?? PB_TITLES.other;
  const reminderAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: wpError } = await admin
    .from("workout_progress")
    .insert({
      user_id: row.user_id,
      workout_id: null,           // external workout — no library row
      workout_title: title,
      completed_at: row.ended_at ?? row.started_at,
      duration_seconds: newDuration,
      pb_share_reminder_at: reminderAt,
      pb_share_notified_at: null,
    });
  if (wpError) {
    console.error("[activity-upsert] workout_progress insert failed:", wpError.message);
    return;
  }

  console.log(
    "[activity-upsert] PB detected — reminder scheduled",
    JSON.stringify({
      user_id: row.user_id,
      activity_type: canonicalType,
      duration_pb: isDurationPB,
      distance_pb: isDistancePB,
      new_duration: newDuration,
      prev_max_duration: prevMaxDuration,
      new_distance: newDistance,
      prev_max_distance: prevMaxDistance,
      reminder_at: reminderAt,
    }),
  );
}
