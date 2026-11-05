import { describe, it, expect } from "bun:test";
import {
  isStalePermissionChange,
  mapGarminActivity,
  normaliseDeviceName,
  secretMatches,
  statusForPermissions,
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
});
