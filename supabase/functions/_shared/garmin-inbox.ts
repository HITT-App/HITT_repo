import type { ActivityRow } from "./activity-upsert.ts";

export type GarminActivitySummary = {
  userId?: string;
  summaryId?: string;
  activityId?: string | number;
  activityType?: string;
  startTimeInSeconds?: number;
  durationInSeconds?: number;
  activeKilocalories?: number;
  averageHeartRateInBeatsPerMinute?: number;
  distanceInMeters?: number;
  deviceName?: string;
  parentSummaryId?: string | number;
  manual?: boolean;
};

export type PermissionsChange = {
  userId?: string;
  permissions?: string[];
  changeTimeInSeconds?: number;
};

// Comparison time doesn't depend on where the values first differ.
export function secretMatches(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

// Attribution adds the "Garmin" prefix, so it's removed here to avoid "Garmin Garmin fenix 8".
export function normaliseDeviceName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const name = raw.trim().replace(/^garmin\s+/i, "").trim();
  if (!name || name.toLowerCase() === "unknown") return null;
  return name;
}

// Returns null for rows we never store: multisport children, whose totals sit on
// the parent, and anything missing the fields a workout needs.
export function mapGarminActivity(summary: GarminActivitySummary, userId: string): ActivityRow | null {
  if (summary.parentSummaryId != null) return null;
  const id = summary.activityId ?? summary.summaryId;
  if (id == null || !summary.startTimeInSeconds || !summary.durationInSeconds) return null;

  const startMs = summary.startTimeInSeconds * 1000;
  return {
    user_id: userId,
    activity_type: summary.activityType ?? "other",
    started_at: new Date(startMs).toISOString(),
    ended_at: new Date(startMs + summary.durationInSeconds * 1000).toISOString(),
    duration_seconds: summary.durationInSeconds,
    calories_burned: summary.activeKilocalories ?? null,
    avg_heart_rate: summary.averageHeartRateInBeatsPerMinute ?? null,
    distance_km: summary.distanceInMeters != null ? summary.distanceInMeters / 1000 : null,
    source_platform: "garmin_api",
    source_platform_id: String(id),
    garmin_activity_id: String(id),
    garmin_device_name: summary.manual ? null : normaliseDeviceName(summary.deviceName),
  };
}

export function statusForPermissions(permissions: string[], current: string): string {
  if (permissions.length === 0) return "permission_off";
  return current === "permission_off" ? "active" : current;
}

// Notifications can arrive out of order, so an older change never overwrites a newer one.
export function isStalePermissionChange(changeTime: number | undefined, lastApplied: number | null): boolean {
  return changeTime != null && lastApplied != null && changeTime < lastApplied;
}
