// Turns a HIIT route into a Garmin course. Pure, so it can be tested without Garmin.

import { hiitName } from "./garmin-name.ts";

export const COURSE_ACTIVITY_TYPES = [
  "RUNNING",
  "HIKING",
  "OTHER",
  "MOUNTAIN_BIKING",
  "TRAIL_RUNNING",
  "ROAD_CYCLING",
  "GRAVEL_CYCLING",
] as const;
export type CourseActivityType = typeof COURSE_ACTIVITY_TYPES[number];

// Garmin takes about 10,000 points, no more than 100 m apart. Spacing leaves room for rounding.
const MAX_GEO_POINTS = 10_000;
const POINT_SPACING_M = 95;
const MAX_NAME_LENGTH = 100;
const EARTH_RADIUS_M = 6_371_000;

export type HiitRoute = {
  user_id: string | null;
  name: string | null;
  coordinates: unknown;
  surface_type: string | null;
  elevation_gain_m: number | null;
  is_public: boolean | null;
  is_official: boolean | null;
};

export type GeoPoint = { latitude: number; longitude: number; elevation?: number };

export type GarminCourse = {
  courseName: string;
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  geoPoints: GeoPoint[];
  activityType: CourseActivityType;
  coordinateSystem: "WGS84";
};

export type CourseResult =
  | { ok: true; course: GarminCourse }
  | { ok: false; reason: "too_few_points" | "too_long" };

// The service-role client skips row security, so this repeats the routes table's read rule.
export function canSendRoute(route: Pick<HiitRoute, "user_id" | "is_public" | "is_official">, userId: string): boolean {
  return route.user_id === userId || route.is_public === true || route.is_official === true;
}

export function courseActivityType(surface: string | null, chosen?: unknown): CourseActivityType {
  if (COURSE_ACTIVITY_TYPES.includes(chosen as CourseActivityType)) return chosen as CourseActivityType;
  return surface === "trail" ? "TRAIL_RUNNING" : "RUNNING";
}

function metresBetween(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function readPoints(coordinates: unknown): GeoPoint[] {
  if (!Array.isArray(coordinates)) return [];
  const points: GeoPoint[] = [];
  for (const c of coordinates) {
    const { lat, lng, alt } = (c ?? {}) as { lat?: unknown; lng?: unknown; alt?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const point: GeoPoint = { latitude: lat, longitude: lng };
    if (typeof alt === "number" && Number.isFinite(alt)) point.elevation = alt;
    points.push(point);
  }
  return points;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

// Routes drawn in the app are straight lines between taps, often far more than 100 m apart.
// Elevation is only interpolated between known values. Otherwise Garmin fills it in.
function fillGaps(points: GeoPoint[]): GeoPoint[] {
  const filled: GeoPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const steps = Math.ceil(metresBetween(from, to) / POINT_SPACING_M);
    for (let step = 1; step < steps; step++) {
      const t = step / steps;
      const point: GeoPoint = {
        latitude: round(from.latitude + (to.latitude - from.latitude) * t, 7),
        longitude: round(from.longitude + (to.longitude - from.longitude) * t, 7),
      };
      if (from.elevation !== undefined && to.elevation !== undefined) {
        point.elevation = round(from.elevation + (to.elevation - from.elevation) * t, 1);
      }
      filled.push(point);
    }
    filled.push(to);
    // Stops a route with absurdly far-apart points from building a huge array first.
    if (filled.length > MAX_GEO_POINTS) return filled;
  }
  return filled;
}

// Names and the line only. A public route's description is another user's writing.
export function mapCourse(route: HiitRoute, chosenActivity?: unknown): CourseResult {
  const points = readPoints(route.coordinates);
  if (points.length < 2) return { ok: false, reason: "too_few_points" };

  let distance = 0;
  for (let i = 1; i < points.length; i++) distance += metresBetween(points[i - 1], points[i]);
  if (distance <= 0) return { ok: false, reason: "too_few_points" };

  const geoPoints = fillGaps(points);
  if (geoPoints.length > MAX_GEO_POINTS) return { ok: false, reason: "too_long" };

  let gain = 0;
  let loss = 0;
  let measured = false;
  for (let i = 1; i < points.length; i++) {
    const { elevation: from } = points[i - 1];
    const { elevation: to } = points[i];
    if (from === undefined || to === undefined) continue;
    measured = true;
    if (to > from) gain += to - from;
    else loss += from - to;
  }
  // Garmin refuses null here, and drawn routes have no heights to add up.
  const elevationGain = measured ? gain : Math.max(0, Number(route.elevation_gain_m) || 0);

  return {
    ok: true,
    course: {
      courseName: hiitName(route.name, "Route").slice(0, MAX_NAME_LENGTH),
      distance: round(distance, 1),
      elevationGain: round(elevationGain, 1),
      elevationLoss: round(loss, 1),
      geoPoints,
      activityType: courseActivityType(route.surface_type, chosenActivity),
      coordinateSystem: "WGS84",
    },
  };
}

export type CourseLink = {
  garmin_course_id: string | number | null;
  garmin_user_id: string | null;
  content_hash: string | null;
};

// A course ID only means something in the Garmin account it was created in.
export function planCourseSend(link: CourseLink | null, garminUserId: string, hash: string): "skip" | "update" | "create" {
  if (!link?.garmin_course_id || link.garmin_user_id !== garminUserId) return "create";
  return link.content_hash === hash ? "skip" : "update";
}
