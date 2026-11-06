import { describe, it, expect } from "bun:test";
import { lastPerSourceId, mapBodyComp, mapDaily, mapHrv, mapSleep, mapSleepScore, mapStressDetail, mapUserMetrics } from "./garmin-health";

const summary = (rows: { metric_type: string; value: number }[]) => Object.fromEntries(rows.map(r => [r.metric_type, r.value]));

describe("mapDaily", () => {
  it("saves no steps or resting heart rate when the watch recorded none", () => {
    const rows = mapDaily({ calendarDate: "2026-11-05", steps: 0, restingHeartRateInBeatsPerMinute: 0 }, "u1");
    expect(rows.map(r => r.metric_type)).not.toContain("steps");
    expect(rows.map(r => r.metric_type)).not.toContain("resting_heart_rate");
  });

  it("maps synthetic steps, resting heart rate and stress", () => {
    const rows = mapDaily({ calendarDate: "2026-11-05", steps: 4210, restingHeartRateInBeatsPerMinute: 64, averageStressLevel: 30 }, "u");
    expect(summary(rows)).toEqual({ steps: 4210, resting_heart_rate: 64, stress: 30 });
    expect(rows[0]).toMatchObject({
      user_id: "u",
      recorded_at: "2026-11-05T12:00:00Z",
      source_platform: "garmin_api",
      source_platform_id: "steps-2026-11-05",
    });
  });

  it("keeps one ID per day, so a later summary replaces the earlier one", () => {
    const morning = mapDaily({ calendarDate: "2026-11-05", steps: 100 }, "u")[0];
    const evening = mapDaily({ calendarDate: "2026-11-05", steps: 9000 }, "u")[0];
    expect(morning.source_platform_id).toBe(evening.source_platform_id);
  });

  it("skips missing and unmeasured values", () => {
    expect(mapDaily({ calendarDate: "2026-11-05", averageStressLevel: -1 }, "u")).toEqual([]);
    expect(mapDaily({ steps: 10 }, "u")).toEqual([]);
  });
});

describe("mapStressDetail", () => {
  it("takes the latest Body Battery, comparing offsets as numbers", () => {
    const rows = mapStressDetail({ calendarDate: "2026-11-05", timeOffsetBodyBatteryValues: { "900": 40, "10800": 62, "180": 90 } }, "u");
    expect(summary(rows)).toEqual({ body_battery: 62 });
  });

  it("handles no readings", () => {
    expect(mapStressDetail({ calendarDate: "2026-11-05", timeOffsetBodyBatteryValues: {} }, "u")).toEqual([]);
    expect(mapStressDetail({ calendarDate: "2026-11-05" }, "u")).toEqual([]);
  });
});

describe("other metrics", () => {
  it("converts weight to kg and keeps body fat", () => {
    const rows = mapBodyComp({ summaryId: "b", measurementTimeInSeconds: 1762300800, weightInGrams: 72500, bodyFatInPercent: 18.5 }, "u");
    expect(summary(rows)).toEqual({ weight: 72.5, body_fat: 18.5 });
    expect(rows[0].recorded_at).toBe("2025-11-05T00:00:00.000Z");
  });

  it("maps VO2 max and HRV", () => {
    expect(summary(mapUserMetrics({ calendarDate: "2026-11-05", vo2Max: 48 }, "u"))).toEqual({ vo2_max: 48 });
    expect(summary(mapHrv({ calendarDate: "2026-11-05", lastNightAvg: 55 }, "u"))).toEqual({ hrv: 55 });
  });
});

describe("mapSleep", () => {
  const sleep = {
    calendarDate: "2026-11-05",
    startTimeInSeconds: 1762300800,
    durationInSeconds: 28800,
    deepSleepDurationInSeconds: 3600,
    lightSleepDurationInSeconds: 18000,
    remSleepInSeconds: 5400,
    awakeDurationInSeconds: 1800,
    overallSleepScore: { value: 87 },
  };

  it("maps a synthetic night into minutes", () => {
    expect(mapSleep(sleep, "u")).toEqual({
      user_id: "u",
      sleep_date: "2026-11-05",
      bedtime: "2025-11-05T00:00:00.000Z",
      wake_time: "2025-11-05T08:00:00.000Z",
      duration_minutes: 480,
      deep_sleep_minutes: 60,
      light_sleep_minutes: 300,
      rem_sleep_minutes: 90,
      awake_minutes: 30,
      source_platform: "garmin_api",
      source_platform_id: "sleep-2026-11-05",
    });
    expect(summary(mapSleepScore(sleep, "u"))).toEqual({ sleep_score: 87 });
  });

  it("refuses an incomplete night", () => {
    expect(mapSleep({ calendarDate: "2026-11-05" }, "u")).toBeNull();
  });
});

describe("lastPerSourceId", () => {
  const row = (id: string, value: number, user_id = "u1") => ({ user_id, source_platform_id: id, value });

  it("keeps the last row for a repeated id", () => {
    expect(lastPerSourceId([row("a", 1), row("b", 2), row("a", 3)])).toEqual([row("a", 3), row("b", 2)]);
  });

  it("keeps the same id for different users", () => {
    expect(lastPerSourceId([row("a", 1, "u1"), row("a", 2, "u2")])).toHaveLength(2);
  });
});
