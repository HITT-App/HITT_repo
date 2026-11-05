// An allowlist, so a wearable source added later stays out of AI prompts until
// someone decides otherwise. Null is a row logged by hand in the app.
const FIRST_PARTY_ACTIVITY_SOURCES = new Set(["hitt_phone", "hitt_garmin_watch", "manual"]);

type ActivityRow = { source_platform?: string | null };
type MetricRow = { source_platform?: string | null; notes?: string | null };
type ProgressRow = { workout_id?: string | null; workout_source?: string | null };

// App Store 5.1.3: without ai_health_consent, wearable and HealthKit data must not reach the AI.
export function consentedActivities<T extends ActivityRow>(rows: T[], consent: boolean): T[] {
  if (consent) return rows;
  return rows.filter(r => r.source_platform == null || FIRST_PARTY_ACTIVITY_SOURCES.has(r.source_platform));
}

// useWatchSync writes watch readings with no source_platform, marked only in notes.
export function consentedMetrics<T extends MetricRow>(rows: T[], consent: boolean): T[] {
  if (consent) return rows;
  return rows.filter(r => r.source_platform == null && !r.notes?.startsWith("watch_sync"));
}

// activity-upsert logs external PBs with no workout_id and the default 'catalogue' source.
export function consentedProgress<T extends ProgressRow>(rows: T[], consent: boolean): T[] {
  if (consent) return rows;
  return rows.filter(r => !(r.workout_id == null && r.workout_source === "catalogue"));
}
