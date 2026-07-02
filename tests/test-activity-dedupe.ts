// Pure unit tests for _shared/activity-types.ts + activity-upsert.ts.
// Uses a mocked supabase client so every case runs against a controlled
// dataset — no auth, no live DB.
//
// Usage:
//   npx tsx tests/test-activity-dedupe.ts

import {
  normaliseActivityType,
  sourcePriority,
  SOURCE_PRIORITY,
  CANONICAL_ACTIVITY_TYPES,
  FUZZY_MATCH_WINDOW_SECONDS,
} from "../supabase/functions/_shared/activity-types.ts";
import {
  activityFingerprint,
  upsertActivities,
  type ActivityRow,
} from "../supabase/functions/_shared/activity-upsert.ts";

const results: { name: string; passed: boolean; details?: string }[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, passed: true }); })
    .catch((err) => {
      results.push({ name, passed: false, details: String(err?.message ?? err) });
    });
}

function assertEq<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ?? "assertEq"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── Mock supabase (activity_logs table only) ────────────────────────────────

interface MockRow {
  id: string;
  user_id: string;
  activity_type: string;
  started_at: string;
  duration_seconds: number;
  source_platform: string;
  source_platform_id: string;
  fingerprint_hash: string;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  distance_km: number | null;
}

function mockAdmin(initialRows: Partial<MockRow>[] = []) {
  const store: MockRow[] = initialRows.map((r, i) => ({
    id: r.id ?? `existing-${i}`,
    user_id: r.user_id ?? "u1",
    activity_type: r.activity_type ?? "running",
    started_at: r.started_at ?? "2026-07-01T10:00:00Z",
    duration_seconds: r.duration_seconds ?? 1800,
    source_platform: r.source_platform ?? "garmin",
    source_platform_id: r.source_platform_id ?? `spid-${i}`,
    fingerprint_hash: r.fingerprint_hash ?? "fingerprint-placeholder",
    calories_burned: r.calories_burned ?? null,
    avg_heart_rate: r.avg_heart_rate ?? null,
    distance_km: r.distance_km ?? null,
  }));
  const audit = { updates: 0, inserts: 0 };

  const admin = {
    from(table: string) {
      if (table !== "activity_logs") throw new Error(`unexpected table ${table}`);
      return {
        select(_cols: string) {
          let userIds: string[] | null = null;
          let minStart: string | null = null;
          let maxStart: string | null = null;
          const chain = {
            in(_col: string, values: string[]) { userIds = values; return chain; },
            gte(_col: string, v: string) { minStart = v; return chain; },
            lte(_col: string, v: string) {
              maxStart = v;
              const rows = store.filter(r => {
                if (userIds && !userIds.includes(r.user_id)) return false;
                if (minStart && r.started_at < minStart) return false;
                if (maxStart && r.started_at > maxStart) return false;
                return true;
              });
              return Promise.resolve({ data: rows, error: null });
            },
          };
          return chain;
        },
        upsert(rows: any[], _opts: any) {
          const inserted: MockRow[] = [];
          for (const r of rows) {
            const conflict = store.find(s =>
              s.user_id === r.user_id
              && s.source_platform === r.source_platform
              && s.source_platform_id === r.source_platform_id);
            if (conflict) continue;
            const newRow: MockRow = {
              id: `new-${store.length}`,
              user_id: r.user_id,
              activity_type: r.activity_type,
              started_at: r.started_at,
              duration_seconds: r.duration_seconds,
              source_platform: r.source_platform,
              source_platform_id: r.source_platform_id,
              fingerprint_hash: r.fingerprint_hash,
              calories_burned: r.calories_burned ?? null,
              avg_heart_rate: r.avg_heart_rate ?? null,
              distance_km: r.distance_km ?? null,
            };
            store.push(newRow);
            inserted.push(newRow);
            audit.inserts++;
          }
          return {
            select(_cols: string) {
              return Promise.resolve({ data: inserted, error: null });
            },
          };
        },
        update(patch: Record<string, unknown>) {
          const chain = {
            eq(_col: string, id: string) {
              const row = store.find(r => r.id === id);
              if (row) {
                Object.assign(row, patch);
                audit.updates++;
              }
              return Promise.resolve({ error: null });
            },
          };
          return chain;
        },
      };
    },
  };

  return { admin, store, audit };
}

// ── Normaliser tests ────────────────────────────────────────────────────────

test("NORM-01 run/running/jog collapse to running", () => {
  assertEq(normaliseActivityType("run"), "running");
  assertEq(normaliseActivityType("Running"), "running");
  assertEq(normaliseActivityType("JOG"), "running");
  assertEq(normaliseActivityType("trail run"), "running");
});

test("NORM-02 bike/cycling/spin collapse to cycling", () => {
  assertEq(normaliseActivityType("bike"), "cycling");
  assertEq(normaliseActivityType("cycling"), "cycling");
  assertEq(normaliseActivityType("Spinning"), "cycling");
  assertEq(normaliseActivityType("indoor_cycling"), "cycling");
});

test("NORM-03 strength family collapses to strength", () => {
  assertEq(normaliseActivityType("weightlifting"), "strength");
  assertEq(normaliseActivityType("functionalStrengthTraining"), "strength");
  assertEq(normaliseActivityType("Traditional Strength Training"), "strength");
});

test("NORM-04 hiit family (Garmin CARDIO_TRAINING → hiit)", () => {
  assertEq(normaliseActivityType("hiit"), "hiit");
  assertEq(normaliseActivityType("interval training"), "hiit");
  assertEq(normaliseActivityType("cardio_training"), "hiit");   // Garmin sub_sport
});

test("NORM-05 unknown falls to 'other'", () => {
  assertEq(normaliseActivityType("kayaking"), "other");
  assertEq(normaliseActivityType(""), "other");
  assertEq(normaliseActivityType(null), "other");
  assertEq(normaliseActivityType(undefined), "other");
});

test("NORM-06 case + punctuation insensitive", () => {
  assertEq(normaliseActivityType("  Run  "), "running");
  assertEq(normaliseActivityType("mountain-bike"), "cycling");
  assertEq(normaliseActivityType("STAIR_STEPPER"), "stairs");
});

// ── Source priority tests ───────────────────────────────────────────────────

test("PRIO-01 direct-push sources outrank all HealthKit-mediated", () => {
  if (sourcePriority("hitt_watch") <= sourcePriority("apple_watch")) throw new Error("hitt_watch must outrank apple_watch");
  if (sourcePriority("hitt_garmin_watch") <= sourcePriority("garmin")) throw new Error("hitt_garmin_watch must outrank garmin");
});

test("PRIO-02 unknown source has priority 0", () => {
  assertEq(sourcePriority("randomvendor"), 0);
});

test("PRIO-03 priority table covers every vendor named in CLAUDE.md multi-wearable list", () => {
  const required = ["apple_watch", "garmin", "fitbit", "whoop", "oura"];
  for (const s of required) {
    if (!(s in SOURCE_PRIORITY)) throw new Error(`missing priority for ${s}`);
  }
});

// ── Fingerprint tests ───────────────────────────────────────────────────────

test("FP-01 same real workout with different activity_type strings collides", async () => {
  const a = await activityFingerprint({
    user_id: "u1", activity_type: "run", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  const b = await activityFingerprint({
    user_id: "u1", activity_type: "Running", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  assertEq(a, b, "run vs Running fingerprint");
});

test("FP-02 different activities in same minute don't collide", async () => {
  const a = await activityFingerprint({
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  const b = await activityFingerprint({
    user_id: "u1", activity_type: "cycling", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  if (a === b) throw new Error("running should not collide with cycling");
});

// ── Upsert integration tests (mocked supabase) ──────────────────────────────

test("UP-01 fresh row inserts", async () => {
  const { admin, audit } = mockAdmin();
  const row: ActivityRow = {
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800, source_platform: "garmin", source_platform_id: "g-123",
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.inserted, 1);
  assertEq(result.upgraded, 0);
  assertEq(audit.inserts, 1);
});

test("UP-02 exact fingerprint match skipped", async () => {
  // Seed the store with a row that shares the same fingerprint as incoming.
  const seedFP = await activityFingerprint({
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  const { admin, audit } = mockAdmin([{
    user_id: "u1",
    activity_type: "running",
    started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800,
    source_platform: "garmin",
    fingerprint_hash: seedFP,
  }]);
  const row: ActivityRow = {
    user_id: "u1", activity_type: "run", started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800, source_platform: "garmin", source_platform_id: "g-999",
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.inserted, 0);
  assertEq(result.skipped, 1);
  assertEq(audit.updates, 0);
});

test("UP-03 fuzzy match within 90s window, lower priority incoming → skip", async () => {
  // Seed with a Garmin-priority row; incoming healthkit_other (lower).
  const seedFP = await activityFingerprint({
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  const { admin, audit } = mockAdmin([{
    user_id: "u1",
    activity_type: "running",
    started_at: "2026-07-01T10:00:45Z",  // 45s drift → different fingerprint, but within fuzzy window
    duration_seconds: 1800,
    source_platform: "garmin",
    fingerprint_hash: seedFP + "-different",
  }]);
  const row: ActivityRow = {
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800, source_platform: "healthkit_other", source_platform_id: "hk-1",
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.inserted, 0);
  assertEq(result.upgraded, 0);
  assertEq(result.skipped, 1);
});

test("UP-04 fuzzy match within 90s window, higher priority incoming → upgrade", async () => {
  // Seed with a HealthKit-mediated garmin row; incoming hitt_garmin_watch (higher).
  const { admin, store, audit } = mockAdmin([{
    id: "seed-1",
    user_id: "u1",
    activity_type: "running",
    started_at: "2026-07-01T10:00:03Z",   // 3s clock skew, adjacent minute-bucket
    duration_seconds: 1800,
    source_platform: "garmin",
    source_platform_id: "g-abc",
    calories_burned: 250,
    avg_heart_rate: 145,
    fingerprint_hash: "seed-fp",
  }]);
  const row: ActivityRow = {
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800, source_platform: "hitt_garmin_watch",
    source_platform_id: "gw-xyz",
    calories_burned: null,     // direct push doesn't send calories in this test
    avg_heart_rate: null,
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.upgraded, 1, "expected upgrade");
  assertEq(result.inserted, 0);
  assertEq(audit.updates, 1);
  // Existing row's richer fields must NOT be blanked out by the upgrade.
  const upgraded = store.find(r => r.id === "seed-1")!;
  assertEq(upgraded.source_platform, "hitt_garmin_watch", "source_platform upgraded");
  assertEq(upgraded.source_platform_id, "gw-xyz", "source_platform_id swapped");
  assertEq(upgraded.calories_burned, 250, "calories preserved from richer source");
  assertEq(upgraded.avg_heart_rate, 145, "avg_heart_rate preserved");
});

test("UP-05 fuzzy match outside 90s window → treated as different workout", async () => {
  const { admin } = mockAdmin([{
    user_id: "u1",
    activity_type: "running",
    started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800,
    source_platform: "garmin",
    fingerprint_hash: "seed-fp",
  }]);
  const row: ActivityRow = {
    user_id: "u1", activity_type: "running",
    started_at: "2026-07-01T10:02:30Z",   // 150s later — outside window
    duration_seconds: 1800, source_platform: "garmin", source_platform_id: "g-2",
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.inserted, 1);
});

test("UP-06 same source_platform + source_platform_id collapses via exact key", async () => {
  const seedFP = await activityFingerprint({
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z", duration_seconds: 1800,
  });
  const { admin } = mockAdmin([{
    user_id: "u1",
    activity_type: "running",
    started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800,
    source_platform: "garmin",
    source_platform_id: "duplicate-id",
    fingerprint_hash: seedFP,
  }]);
  const row: ActivityRow = {
    user_id: "u1", activity_type: "running", started_at: "2026-07-01T10:00:00Z",
    duration_seconds: 1800, source_platform: "garmin", source_platform_id: "duplicate-id",
  };
  const result = await upsertActivities(admin, [row]);
  assertEq(result.inserted, 0);
});

// ── Report ──────────────────────────────────────────────────────────────────

// Wait for all queued test() promises to settle before reporting.
setTimeout(() => {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);
  console.log("");
  console.log(`ACTIVITY DEDUPE TESTS — ${passed}/${results.length} passed`);
  console.log("─".repeat(60));
  for (const r of results) {
    console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}${r.details ? "  — " + r.details : ""}`);
  }
  if (failed.length) {
    console.log("");
    console.log(`FAILED: ${failed.length}`);
    process.exit(1);
  }
}, 200);
