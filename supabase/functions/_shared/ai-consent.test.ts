import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { consentedActivities, consentedMetrics, consentedProgress, garminAiActive } from "./ai-consent";

const NONE = { health: false, garmin: false };
const HEALTH = { health: true, garmin: false };
const GARMIN = { health: false, garmin: true };
const BOTH = { health: true, garmin: true };

describe("consentedActivities", () => {
  const rows = [
    { source_platform: null },
    { source_platform: "hitt_phone" },
    { source_platform: "hitt_garmin_watch" },
    { source_platform: "apple_watch" },
    { source_platform: "apple_health" },
    { source_platform: "garmin" },
    { source_platform: "some_future_source" },
  ];

  it("keeps only first-party rows without consent", () => {
    expect(consentedActivities(rows, NONE).map(r => r.source_platform)).toEqual([
      null,
      "hitt_phone",
      "hitt_garmin_watch",
    ]);
  });

  it("keeps everything with consent", () => {
    expect(consentedActivities(rows, HEALTH)).toEqual(rows);
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
    expect(consentedMetrics(rows, NONE)).toEqual([rows[0]]);
  });

  it("keeps everything with consent", () => {
    expect(consentedMetrics(rows, HEALTH)).toEqual(rows);
  });
});

describe("consentedProgress", () => {
  const rows = [
    { workout_id: "abc", workout_source: "catalogue" },
    { workout_id: null, workout_source: "ai_generated" },
    { workout_id: null, workout_source: "catalogue" },
  ];

  it("drops external PB rows without consent", () => {
    expect(consentedProgress(rows, NONE)).toEqual([rows[0], rows[1]]);
  });

  it("keeps everything with consent", () => {
    expect(consentedProgress(rows, HEALTH)).toEqual(rows);
  });
});

describe("Garmin AI gate", () => {
  const rows = [
    { source_platform: "garmin_api", garmin_activity_id: "1" },
    { source_platform: "hitt_garmin_watch", garmin_activity_id: "2" },
    { source_platform: "apple_watch", garmin_activity_id: null },
    { source_platform: "hitt_phone", garmin_activity_id: null },
  ];

  it("keeps Garmin rows out, even under another source, with health consent alone", () => {
    expect(consentedActivities(rows, HEALTH).map(r => r.source_platform)).toEqual(["apple_watch", "hitt_phone"]);
    expect(consentedActivities(rows, NONE).map(r => r.source_platform)).toEqual(["hitt_phone"]);
  });

  it("lets Garmin rows through with Garmin consent, separately from health", () => {
    expect(consentedActivities(rows, GARMIN).map(r => r.garmin_activity_id)).toEqual(["1", "2", null]);
    expect(consentedActivities(rows, BOTH)).toEqual(rows);
  });

  it("applies to Garmin health metrics", () => {
    const metric = [{ source_platform: "garmin_api", notes: null }];
    expect(consentedMetrics(metric, HEALTH)).toEqual([]);
    expect(consentedMetrics(metric, GARMIN)).toEqual(metric);
  });

  it("needs the flag, consent, no withdrawal and a live connection", () => {
    const given = { status: "active", ai_consent_at: "2026-11-05T00:00:00Z", ai_consent_withdrawn_at: null };
    expect(garminAiActive(given, "on")).toBe(true);
    expect(garminAiActive(given, "off")).toBe(false);
    expect(garminAiActive(given, undefined)).toBe(false);
    expect(garminAiActive(null, "on")).toBe(false);
    expect(garminAiActive({ ...given, ai_consent_at: null }, "on")).toBe(false);
    expect(garminAiActive({ ...given, ai_consent_withdrawn_at: "2026-11-06T00:00:00Z" }, "on")).toBe(false);
    expect(garminAiActive({ ...given, status: "disconnected" }, "on")).toBe(false);
  });
});

describe("audit of AI functions", () => {
  const functionsDir = join(import.meta.dir, "..");
  const aiFiles = readdirSync(functionsDir)
    .map(name => join(functionsDir, name, "index.ts"))
    .filter(existsSync)
    .filter(file => readFileSync(file, "utf-8").includes("aiChatCompletion"));

  it("finds the AI functions", () => {
    expect(aiFiles.length).toBeGreaterThan(5);
  });

  it("gates every AI function that reads activity_logs", () => {
    const ungated = aiFiles.filter(file => {
      const source = readFileSync(file, "utf-8");
      return source.includes("activity_logs") && !source.includes("consentedActivities");
    });
    expect(ungated).toEqual([]);
  });

  it("selects the Garmin tag wherever activity rows are gated", () => {
    const untagged = aiFiles.filter(file => {
      const source = readFileSync(file, "utf-8");
      if (!source.includes("consentedActivities")) return false;
      const reads = source.match(/from\(['"]activity_logs['"]\)[\s\S]{0,40}?\.select\(['"]([^'"]*)['"]\)/g) ?? [];
      return reads.some(r => !r.includes("*") && !r.includes("garmin_activity_id"));
    });
    expect(untagged).toEqual([]);
  });
});
