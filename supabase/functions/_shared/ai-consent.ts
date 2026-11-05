import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// An allowlist, so a wearable source added later stays out of AI prompts until
// someone decides otherwise. Null is a row logged by hand in the app.
const FIRST_PARTY_ACTIVITY_SOURCES = new Set(["hitt_phone", "hitt_garmin_watch", "manual"]);

export type AiConsent = {
  health: boolean;
  garmin: boolean;
  // Has ever linked Garmin, so blended figures such as the HIIT Score may hold Garmin data.
  garminLinked?: boolean;
};

type ActivityRow = { source_platform?: string | null; garmin_activity_id?: string | null };
type MetricRow = { source_platform?: string | null; notes?: string | null };
type ProgressRow = { workout_id?: string | null; workout_source?: string | null };

// Garmin data has its own consent, whatever the health consent says. A merged row can
// hold Garmin values under another source, so the tag counts as well as the source.
function isGarmin(row: ActivityRow): boolean {
  return row.source_platform === "garmin_api" || row.garmin_activity_id != null;
}

// App Store 5.1.3: without ai_health_consent, wearable and HealthKit data must not reach the AI.
export function consentedActivities<T extends ActivityRow>(rows: T[], consent: AiConsent): T[] {
  return rows.filter(r => {
    if (isGarmin(r)) return consent.garmin;
    if (consent.health) return true;
    return r.source_platform == null || FIRST_PARTY_ACTIVITY_SOURCES.has(r.source_platform);
  });
}

// useWatchSync writes watch readings with no source_platform, marked only in notes.
export function consentedMetrics<T extends MetricRow>(rows: T[], consent: AiConsent): T[] {
  return rows.filter(r => {
    if (r.source_platform === "garmin_api") return consent.garmin;
    if (consent.health) return true;
    return r.source_platform == null && !r.notes?.startsWith("watch_sync");
  });
}

// activity-upsert logs external PBs with no workout_id and the default 'catalogue' source.
export function consentedProgress<T extends ProgressRow>(rows: T[], consent: AiConsent): T[] {
  if (consent.health) return rows;
  return rows.filter(r => !(r.workout_id == null && r.workout_source === "catalogue"));
}

// For sleep logs and readings that have never reached AI without health consent.
export function consentedHealthRow<T extends MetricRow>(row: T | null | undefined, consent: AiConsent): T | null {
  if (!row) return null;
  if (row.source_platform === "garmin_api") return consent.garmin ? row : null;
  return consent.health ? row : null;
}

// The score blends Garmin sleep once linked, so it needs Garmin consent from then on.
export function blendedFigureAllowed(consent: AiConsent): boolean {
  return !consent.garminLinked || consent.garmin;
}

export function garminAiActive(
  connection: { status?: string; ai_consent_at?: string | null; ai_consent_withdrawn_at?: string | null } | null,
  flagValue: unknown,
): boolean {
  if (flagValue !== "on" || !connection?.ai_consent_at) return false;
  if (connection.status === "disconnected") return false;
  return !connection.ai_consent_withdrawn_at;
}

// Fails closed: any read that errors or returns nothing counts as no consent.
export async function readAiConsent(client: SupabaseClient, userId: string): Promise<AiConsent> {
  const [profile, connection, flag] = await Promise.all([
    client.from("profiles").select("ai_health_consent").eq("user_id", userId).maybeSingle(),
    client.from("garmin_connections").select("status, ai_consent_at, ai_consent_withdrawn_at").eq("user_id", userId).maybeSingle(),
    client.from("app_settings").select("value").eq("key", "ff_garmin_ai").maybeSingle(),
  ]);
  return {
    health: profile.data?.ai_health_consent === true,
    garmin: garminAiActive(connection.data, flag.data?.value),
    garminLinked: !!connection.data,
  };
}
