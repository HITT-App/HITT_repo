import { normaliseActivityType } from "./activity-types.ts";
import type { ActivityRow } from "./activity-upsert.ts";

export type GarminActivitySummary = {
  userId?: string;
  summaryId?: string;
  activityId?: string | number;
  activityType?: string;
  startTimeInSeconds?: number;
  startTimeOffsetInSeconds?: number;
  durationInSeconds?: number;
  activeKilocalories?: number;
  averageHeartRateInBeatsPerMinute?: number;
  distanceInMeters?: number;
  deviceName?: string;
  parentSummaryId?: string | number;
  manual?: boolean;
};

export type GarminDetailSample = {
  startTimeInSeconds?: number;
  latitudeInDegree?: number;
  longitudeInDegree?: number;
  heartRate?: number;
};

export type GarminActivityDetail = {
  userId?: string;
  summaryId?: string;
  activityId?: string | number;
  samples?: GarminDetailSample[];
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

// Garmin's portal strips query strings when it saves an endpoint, so the key has to live in the path.
export function webhookKey(requestUrl: string): string | null {
  const url = new URL(requestUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && last !== "garmin-webhook") return last;
  return url.searchParams.get("key");
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
    garmin_summary_id: summary.summaryId ?? null,
    garmin_device_name: summary.manual ? null : normaliseDeviceName(summary.deviceName),
  };
}

// Samples can arrive once per second, far more than a chart or map can show.
// Keeps the first and last so a route always reaches its true end.
export function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

export const MAX_ROUTE_POINTS = 500;
export const MAX_HEART_RATE_POINTS = 300;

// Keeps only what the map and chart need. Altitude, speed, power and cadence are dropped.
export function mapActivityDetail(detail: GarminActivityDetail, userId: string) {
  if (detail.activityId == null) return null;
  const samples = detail.samples ?? [];
  const route = samples
    .filter(s => s.latitudeInDegree != null && s.longitudeInDegree != null)
    .map(s => [s.latitudeInDegree as number, s.longitudeInDegree as number]);
  const heartRate = samples
    .filter(s => s.startTimeInSeconds != null && s.heartRate != null)
    .map(s => [s.startTimeInSeconds as number, s.heartRate as number]);
  return {
    user_id: userId,
    garmin_activity_id: String(detail.activityId),
    route: downsample(route, MAX_ROUTE_POINTS),
    heart_rate: downsample(heartRate, MAX_HEART_RATE_POINTS),
    updated_at: new Date().toISOString(),
  };
}

// Edited values only. The device name stays as it was: Garmin sends 'unknown' here.
export function manualUpdatePatch(row: ActivityRow) {
  return {
    activity_type: normaliseActivityType(row.activity_type),
    started_at: row.started_at,
    ended_at: row.ended_at,
    duration_seconds: row.duration_seconds,
    calories_burned: row.calories_burned,
    avg_heart_rate: row.avg_heart_rate,
    distance_km: row.distance_km,
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
