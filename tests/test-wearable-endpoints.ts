// Smoke test for the wearable ingest endpoints we just deployed.
// Confirms:
//   1. log-watch-workout still works after refactor to shared helper.
//   2. sync-healthkit accepts a valid payload + correctly upserts/dedupes.
//   3. Dedupe: re-posting the same workout doesn't create a second row.
//   4. Cross-source fingerprint dedupe: HealthKit workout with same fingerprint
//      as a Watch workout is correctly skipped.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pbrqdlkjoxvglcdlixbi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM";
const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;

const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function call(fn: string, body: any, token: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, raw: text };
}

let pass = 0, fail = 0;
const t = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else    { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

async function main() {
  console.log("Signing in as test user…");
  const { data: auth, error } = await supa.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (error || !auth.session) {
    console.error("Auth failed:", error?.message);
    process.exit(1);
  }
  const token = auth.session.access_token;
  const userId = auth.user!.id;
  console.log(`Signed in as ${TEST_EMAIL} (${userId})`);

  // Use a deterministic, unique-ish workout id for this run
  const runStamp = Math.floor(Date.now() / 1000);
  const watchWorkoutId = `smoke-test-${runStamp}`;
  const startedAt = new Date(runStamp * 1000).toISOString();
  const endedAt = new Date((runStamp + 600) * 1000).toISOString();

  // --- log-watch-workout ----------------------------------------------------
  console.log("\nlog-watch-workout:");
  const w1 = await call("log-watch-workout", {
    workoutId: watchWorkoutId,
    workoutName: "Smoke Test HIIT",
    activityType: "hiit",
    durationSeconds: 600,
    calories: 220,
    averageHeartRate: 142,
    startedAt, endedAt,
  }, token);
  t("returns 200", w1.status === 200, `status=${w1.status} body=${w1.raw.slice(0, 200)}`);
  t("returns ok=true", w1.json?.ok === true, JSON.stringify(w1.json));
  t("inserted == 1", w1.json?.inserted === 1, `inserted=${w1.json?.inserted}`);

  // Re-post the same workout → should dedupe via (source_platform, source_platform_id)
  const w2 = await call("log-watch-workout", {
    workoutId: watchWorkoutId,
    workoutName: "Smoke Test HIIT",
    activityType: "hiit",
    durationSeconds: 600,
    calories: 220,
    averageHeartRate: 142,
    startedAt, endedAt,
  }, token);
  t("re-post returns 200", w2.status === 200);
  t("re-post inserted == 0 (dedupe)", w2.json?.inserted === 0, `inserted=${w2.json?.inserted} skipped=${w2.json?.skipped}`);

  // --- sync-healthkit (empty payload) --------------------------------------
  console.log("\nsync-healthkit (empty):");
  const empty = await call("sync-healthkit", {}, token);
  t("empty payload returns 200", empty.status === 200, `body=${empty.raw.slice(0, 200)}`);
  t("empty payload returns ok=true", empty.json?.ok === true);

  // --- sync-healthkit (Garmin workout) -------------------------------------
  console.log("\nsync-healthkit (Garmin workout):");
  const garminId = `garmin-smoke-${runStamp}`;
  const garminPayload = {
    workouts: [{
      source_platform: "garmin",
      source_platform_id: garminId,
      activity_type: "running",
      started_at: new Date((runStamp + 3600) * 1000).toISOString(),
      ended_at: new Date((runStamp + 5400) * 1000).toISOString(),
      duration_seconds: 1800,
      calories_burned: 320,
      distance_km: 5.2,
      source_name: "Garmin Connect",
    }],
  };
  const g1 = await call("sync-healthkit", garminPayload, token);
  t("garmin workout returns 200", g1.status === 200, `body=${g1.raw.slice(0, 300)}`);
  t("garmin workout inserted == 1", g1.json?.workouts?.inserted === 1, JSON.stringify(g1.json?.workouts));

  // Same Garmin workout again → dedupe via (source_platform, source_platform_id)
  const g2 = await call("sync-healthkit", garminPayload, token);
  t("garmin re-post inserted == 0 (same-source dedupe)",
    g2.json?.workouts?.inserted === 0,
    `inserted=${g2.json?.workouts?.inserted} skipped=${g2.json?.workouts?.skipped}`);

  // --- Cross-source fingerprint dedupe -------------------------------------
  // Post the SAME Watch workout via sync-healthkit as if it came from a
  // third-party app (e.g. user has Strava that re-saved it). Should be
  // skipped via fingerprint match against the Watch row above.
  console.log("\nsync-healthkit (fingerprint dedupe of Watch workout):");
  const dupePayload = {
    workouts: [{
      source_platform: "healthkit_other",
      source_platform_id: `strava-fake-${runStamp}`,
      activity_type: "hiit",
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: 600,
      calories_burned: 220,
    }],
  };
  const d1 = await call("sync-healthkit", dupePayload, token);
  t("dupe attempt returns 200", d1.status === 200);
  t("dupe attempt inserted == 0 (fingerprint dedupe)",
    d1.json?.workouts?.inserted === 0,
    `inserted=${d1.json?.workouts?.inserted} skipped=${d1.json?.workouts?.skipped}`);

  // --- HR averages ---------------------------------------------------------
  console.log("\nsync-healthkit (daily HR):");
  const today = new Date().toISOString().slice(0, 10);
  const hr = await call("sync-healthkit", {
    dailyHeartRate: [{ date: today, avgBpm: 78 }],
  }, token);
  t("hr payload returns 200", hr.status === 200, `body=${hr.raw.slice(0, 200)}`);
  t("hr inserted == 1", hr.json?.heartRate?.inserted === 1, JSON.stringify(hr.json?.heartRate));

  // --- Auth gating ---------------------------------------------------------
  console.log("\nAuth gating:");
  const noAuth = await fetch(`${SUPABASE_URL}/functions/v1/sync-healthkit`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  t("sync-healthkit refuses request with no Authorization header", noAuth.status === 401);

  console.log(`\n━━━ ${pass} passed, ${fail} failed ━━━`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
