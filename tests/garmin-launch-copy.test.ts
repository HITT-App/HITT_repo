import { describe, expect, it } from "bun:test";
import { getLaunchCopy } from "../src/lib/wearable-launch-copy";

describe("getLaunchCopy for Garmin", () => {
  it("keeps the Apple Health copy for users not connected directly", () => {
    expect(getLaunchCopy("gps", "garmin")?.body).toContain("Apple Health");
  });

  it("never mentions Apple Health once connected", () => {
    for (const type of ["gps", "structured", "gym", "triathlon"] as const) {
      expect(getLaunchCopy(type, "garmin", true)?.body).not.toContain("Apple Health");
    }
  });

  it("doesn't affect other wearables", () => {
    expect(getLaunchCopy("gps", "fitbit", true)?.title).toBe("Track on your Fitbit");
    expect(getLaunchCopy("gps", "phone_only", true)).toBeNull();
  });
});
