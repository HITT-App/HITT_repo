// Shared activity upsert used by both `log-watch-workout` (single row, Watch
// direct path) and `sync-healthkit` (batch, HealthKit aggregator).
//
// Two dedupe layers:
//   1. (user_id, source_platform, source_platform_id) — same-source dedupe.
//   2. (user_id, fingerprint_hash)                    — cross-source dedupe.
//
// The fingerprint is a sha256 of user_id|activity_type|round(epoch/60)|round(duration/30)
// — coarse enough that a Garmin and Apple Watch row for the same workout
// collide, fine enough that two distinct workouts in the same minute don't.

export interface ActivityRow {
  user_id: string;
  activity_type: string;
  started_at: string;          // ISO
  ended_at?: string | null;    // ISO
  duration_seconds: number;
  calories_burned?: number | null;
  avg_heart_rate?: number | null;
  distance_km?: number | null;
  source_platform: string;     // 'apple_watch' | 'garmin' | 'fitbit' | ...
  source_platform_id: string;  // dedupe key within source
  status?: string;             // defaults to 'completed'
}

export async function activityFingerprint(row: Pick<ActivityRow, 'user_id' | 'activity_type' | 'started_at' | 'duration_seconds'>): Promise<string> {
  const epochMin = Math.floor(new Date(row.started_at).getTime() / 1000 / 60);
  const durBucket = Math.floor((row.duration_seconds ?? 0) / 30);
  const input = `${row.user_id}|${row.activity_type ?? ''}|${epochMin}|${durBucket}`;
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface UpsertResult {
  inserted: number;
  skipped: number;
}

// Upsert one or many activities. Rows whose fingerprint already exists in the
// DB are skipped silently — that's the cross-source dedupe path. Rows whose
// (source_platform, source_platform_id) already exists are caught by the
// per-source partial unique index via ON CONFLICT DO NOTHING.
//
// `admin` must be a service-role Supabase client (we trust the caller to have
// verified the user_id matches the authenticated user).
export async function upsertActivities(admin: any, rows: ActivityRow[]): Promise<UpsertResult> {
  if (!rows.length) return { inserted: 0, skipped: 0 };

  // Compute fingerprints.
  const stamped = await Promise.all(
    rows.map(async r => ({
      ...r,
      status: r.status ?? 'completed',
      fingerprint_hash: await activityFingerprint(r),
    }))
  );

  // Cross-source dedupe: pull any fingerprints that already exist for these
  // users so we can drop them before insert. (Bulk insert with ON CONFLICT on
  // two different unique indexes isn't supported in one statement.)
  const userIds = [...new Set(stamped.map(r => r.user_id))];
  const fingerprints = stamped.map(r => r.fingerprint_hash);
  const { data: existing } = await admin
    .from('activity_logs')
    .select('user_id, fingerprint_hash')
    .in('user_id', userIds)
    .in('fingerprint_hash', fingerprints);

  const existingKeys = new Set(
    (existing ?? []).map((e: any) => `${e.user_id}|${e.fingerprint_hash}`)
  );

  const fresh = stamped.filter(r => !existingKeys.has(`${r.user_id}|${r.fingerprint_hash}`));
  const skipped = stamped.length - fresh.length;

  if (!fresh.length) return { inserted: 0, skipped };

  // Same-source dedupe handled by the partial unique index — any conflict on
  // (user_id, source_platform, source_platform_id) is silently dropped.
  const { error, count } = await admin
    .from('activity_logs')
    .upsert(fresh, {
      onConflict: 'user_id, source_platform, source_platform_id',
      ignoreDuplicates: true,
      count: 'exact',
    });

  if (error) throw error;

  return { inserted: count ?? 0, skipped: skipped + (fresh.length - (count ?? 0)) };
}
