import { describe, it, expect } from "bun:test";
import {
  downsample,
  garminWorkoutPush,
  isStalePermissionChange,
  manualUpdatePatch,
  mapActivityDetail,
  mapGarminActivity,
  normaliseDeviceName,
  secretMatches,
  statusForPermissions,
  webhookKey,
} from "./garmin-inbox";
import { normaliseActivityType, sourcePriority } from "./activity-types";

const SUMMARY = {
  userId: "garmin-user",
  summaryId: "s-1",
  activityId: 1001,
  activityType: "HIIT",
  startTimeInSeconds: 1762300800,
  durationInSeconds: 1800,
  activeKilocalories: 300,
  averageHeartRateInBeatsPerMinute: 150,
  distanceInMeters: 2500,
  deviceName: "Garmin fenix 8",
};

describe("mapGarminActivity", () => {
  it("maps a synthetic summary and tags it as Garmin", () => {
    expect(mapGarminActivity(SUMMARY, "u")).toEqual({
      user_id: "u",
      activity_type: "HIIT",
      started_at: "2025-11-05T00:00:00.000Z",
      ended_at: "2025-11-05T00:30:00.000Z",
      duration_seconds: 1800,
      calories_burned: 300,
      avg_heart_rate: 150,
      distance_km: 2.5,
      source_platform: "garmin_api",
      source_platform_id: "1001",
      garmin_activity_id: "1001",
      garmin_summary_id: "s-1",
      garmin_device_name: "fenix 8",
    });
  });

  it("falls back to summaryId and keeps absent stats null", () => {
    const row = mapGarminActivity({ summaryId: "s-2", startTimeInSeconds: 1, durationInSeconds: 60 }, "u")!;
    expect(row.source_platform_id).toBe("s-2");
    expect(row.calories_burned).toBeNull();
    expect(row.distance_km).toBeNull();
  });

  it("never stores multisport children or incomplete rows", () => {
    expect(mapGarminActivity({ ...SUMMARY, parentSummaryId: "p" }, "u")).toBeNull();
    expect(mapGarminActivity({ ...SUMMARY, startTimeInSeconds: undefined }, "u")).toBeNull();
    expect(mapGarminActivity({ ...SUMMARY, activityId: undefined, summaryId: undefined }, "u")).toBeNull();
  });

  it("drops the device for manual activities and never carries location", () => {
    const row = mapGarminActivity({ ...SUMMARY, manual: true }, "u")!;
    expect(row.garmin_device_name).toBeNull();
    expect(Object.keys(row).join()).not.toMatch(/latitude|longitude/i);
  });
});

describe("normaliseDeviceName", () => {
  it("removes a repeated Garmin prefix and unknown values", () => {
    expect(normaliseDeviceName("Garmin fenix 8")).toBe("fenix 8");
    expect(normaliseDeviceName("Forerunner 910XT")).toBe("Forerunner 910XT");
    expect(normaliseDeviceName("unknown")).toBeNull();
    expect(normaliseDeviceName(undefined)).toBeNull();
  });
});

describe("garminWorkoutPush", () => {
  const row = { activity_type: "walking", started_at: "2026-11-05T09:00:00Z", duration_seconds: 600, calories_burned: 40 };
  const end = new Date("2026-11-05T09:10:00Z").getTime();

  it("describes a recent workout", () => {
    expect(garminWorkoutPush(row, end + 60_000)).toEqual({
      title: "Workout logged from Garmin",
      body: "10-min walk · 40 kcal · Tap to share it.",
    });
  });

  it("rounds very short workouts up to a minute and leaves out zero calories", () => {
    const short = { ...row, duration_seconds: 10, calories_burned: null };
    expect(garminWorkoutPush(short, end)?.body).toBe("1-min walk · Tap to share it.");
  });

  it("stays quiet for a workout older than a day", () => {
    expect(garminWorkoutPush(row, end + 25 * 60 * 60 * 1000)).toBeNull();
  });
});

describe("webhookKey", () => {
  const base = "https://x.supabase.co/functions/v1/garmin-webhook";

  it("reads the key from the path", () => {
    expect(webhookKey(`${base}/abc`)).toBe("abc");
    expect(webhookKey(`${base}/abc/`)).toBe("abc");
    expect(webhookKey("http://localhost:9999/garmin-webhook/abc")).toBe("abc");
  });

  it("still accepts the query string form", () => {
    expect(webhookKey(`${base}?key=abc`)).toBe("abc");
  });

  it("finds no key on the bare endpoint", () => {
    expect(webhookKey(base)).toBeNull();
    expect(webhookKey("http://localhost:9999/garmin-webhook")).toBeNull();
  });
});

describe("secretMatches", () => {
  it("accepts only an exact, non-empty match", () => {
    expect(secretMatches("abc", "abc")).toBe(true);
    expect(secretMatches("abd", "abc")).toBe(false);
    expect(secretMatches("abcd", "abc")).toBe(false);
    expect(secretMatches("ab", "abc")).toBe(false);
    expect(secretMatches(null, "abc")).toBe(false);
    expect(secretMatches("abc", undefined)).toBe(false);
  });
});

describe("permissions", () => {
  it("moves between active and permission_off without touching other states", () => {
    expect(statusForPermissions([], "active")).toBe("permission_off");
    expect(statusForPermissions(["ACTIVITY_EXPORT"], "permission_off")).toBe("active");
    expect(statusForPermissions(["ACTIVITY_EXPORT"], "needs_reconnect")).toBe("needs_reconnect");
  });

  it("ignores older changes", () => {
    expect(isStalePermissionChange(100, 200)).toBe(true);
    expect(isStalePermissionChange(300, 200)).toBe(false);
    expect(isStalePermissionChange(100, null)).toBe(false);
  });
});

describe("activity types and priority", () => {
  it("maps Garmin's common types so dedupe works across sources", () => {
    expect(normaliseActivityType("TREADMILL_RUNNING")).toBe("running");
    expect(normaliseActivityType("ROAD_BIKING")).toBe("cycling");
    expect(normaliseActivityType("LAP_SWIMMING")).toBe("swimming");
    expect(normaliseActivityType("INDOOR_CARDIO")).toBe("cardio");
    expect(normaliseActivityType("HIIT")).toBe("hiit");
  });

  it("ranks Garmin direct above its Apple Health copy and below HIIT's watch app", () => {
    expect(sourcePriority("garmin_api")).toBeGreaterThan(sourcePriority("garmin"));
    expect(sourcePriority("garmin_api")).toBeLessThan(sourcePriority("hitt_garmin_watch"));
  });

  it("prefers Garmin over every Apple Health source", () => {
    for (const source of ["apple_watch", "apple_health_native", "healthkit_other"]) {
      expect(sourcePriority("garmin_api")).toBeGreaterThan(sourcePriority(source));
    }
  });
});

describe("activity details", () => {
  it("keeps only route and heart rate, in compact form", () => {
    const row = mapActivityDetail({
      activityId: 7,
      samples: [
        { startTimeInSeconds: 10, latitudeInDegree: 51.5, longitudeInDegree: -0.1, heartRate: 120 },
        { startTimeInSeconds: 11, heartRate: 121 },
        { startTimeInSeconds: 12, latitudeInDegree: 51.6, longitudeInDegree: -0.2 },
      ],
    }, "u")!;
    expect(row.garmin_activity_id).toBe("7");
    expect(row.route).toEqual([[51.5, -0.1], [51.6, -0.2]]);
    expect(row.heart_rate).toEqual([[10, 120], [11, 121]]);
  });

  it("handles manual activities with no samples, and refuses a missing ID", () => {
    expect(mapActivityDetail({ activityId: 7 }, "u")!.route).toEqual([]);
    expect(mapActivityDetail({ samples: [] }, "u")).toBeNull();
  });

  it("downsamples without losing the first and last points", () => {
    const points = Array.from({ length: 10001 }, (_, i) => i);
    const out = downsample(points, 500);
    expect(out.length).toBe(500);
    expect(out[0]).toBe(0);
    expect(out[499]).toBe(10000);
    expect(downsample([1, 2], 500)).toEqual([1, 2]);
  });
});

describe("manual edits", () => {
  it("updates stats and type but leaves the device name alone", () => {
    const row = mapGarminActivity({ ...SUMMARY, activityType: "ROAD_BIKING", deviceName: "unknown", manual: true }, "u")!;
    const patch = manualUpdatePatch(row);
    expect(patch.activity_type).toBe("cycling");
    expect(patch.duration_seconds).toBe(1800);
    expect(Object.keys(patch)).not.toContain("garmin_device_name");
    expect(Object.keys(patch)).not.toContain("source_platform");
  });
});
