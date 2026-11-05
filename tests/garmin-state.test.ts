import { describe, expect, it } from "bun:test";
import { garminAttribution, garminCardState, type GarminConnectionRow, missingSharing, parseGarminReturn, workoutSyncLabel } from "../src/lib/garmin-state";

const row = (over: Partial<GarminConnectionRow> = {}): GarminConnectionRow => ({
  status: "active",
  permissions: ["ACTIVITY_EXPORT", "HEALTH_EXPORT", "WORKOUT_IMPORT", "COURSE_IMPORT"],
  disconnect_reason: null,
  disconnected_at: null,
  ai_purge_from: null,
  ai_consent_at: null,
  workout_import_consented_at: null,
  course_import_consented_at: null,
  last_activity_at: null,
  last_workout_pushed_at: null,
  ...over,
});

describe("garminCardState", () => {
  it("covers each state", () => {
    expect(garminCardState(null)).toBe("not_connected");
    expect(garminCardState(row())).toBe("connected");
    expect(garminCardState(row({ status: "needs_reconnect" }))).toBe("needs_reconnect");
    expect(garminCardState(row({ status: "permission_off" }))).toBe("permission_off");
    expect(garminCardState(row({ permissions: [] }))).toBe("permission_off");
    expect(garminCardState(row({ status: "disconnected", disconnect_reason: "user" }))).toBe("not_connected");
    expect(garminCardState(row({ status: "disconnected", disconnect_reason: "garmin_connect" }))).toBe("removed_in_garmin");
  });
});

describe("missingSharing", () => {
  it("names what was refused", () => {
    expect(missingSharing(row().permissions)).toEqual([]);
    expect(missingSharing(["ACTIVITY_EXPORT"])).toHaveLength(3);
  });
});

describe("garminAttribution", () => {
  it("never doubles the name", () => {
    expect(garminAttribution("fenix 8")).toBe("Garmin fenix 8");
    expect(garminAttribution("Garmin fenix 8")).toBe("Garmin fenix 8");
    expect(garminAttribution(null)).toBe("Garmin");
    expect(garminAttribution("  ")).toBe("Garmin");
  });
});

describe("parseGarminReturn", () => {
  it("reads the return link", () => {
    expect(parseGarminReturn("hiitfitness://garmin-connected?status=pending&result=abc")).toEqual({ status: "pending", result: "abc" });
    expect(parseGarminReturn("hiitfitness://garmin-connected?status=declined")).toEqual({ status: "declined" });
    expect(parseGarminReturn("hiitfitness://garmin-connected?status=failed")).toEqual({ status: "failed" });
  });

  it("treats a pending link with no result as failed", () => {
    expect(parseGarminReturn("hiitfitness://garmin-connected?status=pending")).toEqual({ status: "failed" });
  });

  it("ignores other links, including sign-in ones", () => {
    expect(parseGarminReturn("hiitfitness://auth-callback?code=1")).toBeNull();
  });
});

describe("workoutSyncLabel", () => {
  it("has a label for each status and nothing for unknown ones", () => {
    expect(workoutSyncLabel("sent")).toBe("On your watch after next sync");
    expect(workoutSyncLabel("needs_distance")).toContain("distance");
    expect(workoutSyncLabel(null)).toBeNull();
  });
});
