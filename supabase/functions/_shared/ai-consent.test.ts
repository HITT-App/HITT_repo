import { describe, it, expect } from "bun:test";
import { consentedActivities, consentedMetrics, consentedProgress } from "./ai-consent";

describe("consentedActivities", () => {
  const rows = [
    { source_platform: null },
    { source_platform: "hitt_phone" },
    { source_platform: "hitt_garmin_watch" },
    { source_platform: "apple_watch" },
    { source_platform: "apple_health" },
    { source_platform: "garmin" },
    { source_platform: "garmin_api" },
    { source_platform: "some_future_source" },
  ];

  it("keeps only first-party rows without consent", () => {
    expect(consentedActivities(rows, false).map(r => r.source_platform)).toEqual([
      null,
      "hitt_phone",
      "hitt_garmin_watch",
    ]);
  });

  it("keeps everything with consent", () => {
    expect(consentedActivities(rows, true)).toEqual(rows);
  });
});

describe("consentedMetrics", () => {
  const rows = [
    { metric_type: "weight", source_platform: null, notes: null },
    { metric_type: "weight", source_platform: "apple_health", notes: null },
    { metric_type: "heart_rate", source_platform: null, notes: "watch_sync" },
    { metric_type: "hrv", source_platform: "healthkit", notes: null },
  ];

  it("keeps only hand-logged rows without consent", () => {
    expect(consentedMetrics(rows, false)).toEqual([rows[0]]);
  });

  it("keeps everything with consent", () => {
    expect(consentedMetrics(rows, true)).toEqual(rows);
  });
});

describe("consentedProgress", () => {
  const rows = [
    { workout_id: "abc", workout_source: "catalogue" },
    { workout_id: null, workout_source: "ai_generated" },
    { workout_id: null, workout_source: "catalogue" },
  ];

  it("drops external PB rows without consent", () => {
    expect(consentedProgress(rows, false)).toEqual([rows[0], rows[1]]);
  });

  it("keeps everything with consent", () => {
    expect(consentedProgress(rows, true)).toEqual(rows);
  });
});
