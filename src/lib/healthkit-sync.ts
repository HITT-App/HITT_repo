import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import {
  HealthKitRead,
  isHealthKitReadAvailable,
  type HealthKitWorkout,
  type HealthKitDailyHR,
  type HealthKitDailySteps,
  type HealthKitSleepNight,
} from "@/plugins/HealthKitReadPlugin";

// Pull recent HealthKit data into Supabase. Foreground-only in v1.
// Server-side dedupe (fingerprint hash + (source_platform, source_platform_id))
// makes re-sending safe, so we can be generous with the lookback window.

const LAST_SYNC_KEY = "hk.lastSyncAt";
const DEFAULT_LOOKBACK_DAYS = 30; // first run pulls a month

// Map HealthKit `sourceBundleId` to our `source_platform` enum. Anything we
// don't recognise becomes "healthkit_other" so it still appears in Jarvis'
// context (we just don't brand it).
function bundleIdToSourcePlatform(bundleId: string): string {
  const id = (bundleId ?? "").toLowerCase();
  if (id.includes("com.garmin")) return "garmin";
  if (id.includes("com.fitbit")) return "fitbit";
  if (id.includes("com.whoop")) return "whoop";
  if (id.includes("com.ouraring")) return "oura";
  // Our own iPhone-side HKWorkoutBuilder writes
  if (id === "com.hiitfitness.app") return "hitt_phone";
  // Apple Watch + iPhone built-ins go via 'com.apple.health'
  if (id.includes("com.apple.health")) return "apple_health_native";
  // The Apple Watch HIIT app
  if (id.includes("com.hiitfitness.app.watchkitapp")) return "apple_watch";
  return "healthkit_other";
}

interface SyncPayload {
  workouts: Array<{
    source_platform: string;
    source_platform_id: string;
    activity_type: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    calories_burned?: number;
    distance_km?: number;
    source_name?: string;
    device_name?: string;
  }>;
  dailyHeartRate: HealthKitDailyHR[];
  dailySteps: HealthKitDailySteps[];
  sleep: Array<HealthKitSleepNight & { source_platform: string }>;
}

async function readLastSyncISO(): Promise<string> {
  const { value } = await Preferences.get({ key: LAST_SYNC_KEY });
  if (value) return value;
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - DEFAULT_LOOKBACK_DAYS);
  return fallback.toISOString();
}

async function writeLastSyncISO(iso: string): Promise<void> {
  await Preferences.set({ key: LAST_SYNC_KEY, value: iso });
}

function shouldSkipForDedupe(w: HealthKitWorkout): boolean {
  // The HIITWatch Watch App already POSTs directly via WCSession with richer
  // metadata (intervals, structured workout linkage). Skip the HealthKit copy.
  const bundle = (w.sourceBundleId ?? "").toLowerCase();
  return bundle.includes("com.hiitfitness.app.watchkitapp");
}

let initialised = false;

// Wire foreground + auth-change triggers. Idempotent; safe to call at module load.
// No-op on non-native, no-op when there's no session (re-fires on next visibilitychange
// once auth lands).
export function initHealthKitSync(): void {
  if (initialised) return;
  initialised = true;
  if (!isHealthKitReadAvailable()) return;

  // Fire on every foreground.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncHealthKitNow().catch(() => {});
    }
  });

  // Fire on auth state changes (sign-in lands → first sync).
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      syncHealthKitNow().catch(() => {});
    }
  });

  // Initial best-effort sync at module load (will bail if no session).
  syncHealthKitNow().catch(() => {});
}

// One-shot sync called on app foreground.
export async function syncHealthKitNow(): Promise<{ ok: boolean; sent?: number; reason?: string }> {
  if (!isHealthKitReadAvailable()) return { ok: false, reason: "not_native" };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: "no_session" };

  const sinceISO = await readLastSyncISO();

  // Pull in parallel — each query is independent.
  const [workoutsResp, hrResp, stepsResp, sleepResp] = await Promise.all([
    HealthKitRead.queryWorkouts({ sinceISO }).catch(() => ({ workouts: [] as HealthKitWorkout[] })),
    HealthKitRead.queryHeartRateAverages({ sinceISO }).catch(() => ({ days: [] as HealthKitDailyHR[] })),
    HealthKitRead.queryDailySteps({ sinceISO }).catch(() => ({ days: [] as HealthKitDailySteps[] })),
    HealthKitRead.querySleep({ sinceISO }).catch(() => ({ nights: [] as HealthKitSleepNight[] })),
  ]);

  const workouts = workoutsResp.workouts
    .filter(w => !shouldSkipForDedupe(w))
    .map(w => ({
      source_platform: bundleIdToSourcePlatform(w.sourceBundleId),
      source_platform_id: w.externalUUID ?? w.uuid,
      activity_type: w.activityType,
      started_at: w.startedAt,
      ended_at: w.endedAt,
      duration_seconds: w.durationSeconds,
      calories_burned: w.calories,
      distance_km: w.distanceKm,
      source_name: w.sourceName,
      device_name: w.deviceName,
    }));

  const sleep = sleepResp.nights.map(n => ({
    ...n,
    source_platform: bundleIdToSourcePlatform(n.sourceBundleId),
  }));

  const payload: SyncPayload = {
    workouts,
    dailyHeartRate: hrResp.days,
    dailySteps: stepsResp.days,
    sleep,
  };

  if (!workouts.length && !hrResp.days.length && !stepsResp.days.length && !sleep.length) {
    await writeLastSyncISO(new Date().toISOString());
    return { ok: true, sent: 0 };
  }

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-healthkit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => null);

  if (!res || !res.ok) {
    // Don't advance lastSyncAt — we'll retry the same window next foreground.
    return { ok: false, reason: `http_${res?.status ?? "network"}` };
  }

  await writeLastSyncISO(new Date().toISOString());
  return { ok: true, sent: workouts.length };
}
