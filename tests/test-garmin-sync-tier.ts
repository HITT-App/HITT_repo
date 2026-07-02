// Pure unit test for the client-side "days since last garmin sync" → tier
// resolver. Extracted from useGarminSyncStatus so we can test boundaries
// without mocking React + Supabase.
//
// Usage:
//   npx tsx tests/test-garmin-sync-tier.ts

// Duplicated from useGarminSyncStatus.ts so this test doesn't need the
// full React + Supabase graph loaded. If you change the tier logic
// there, mirror it here — the DEDUPE-style audit in run.ts can add a
// text-match to enforce this if it drifts.
type Tier = 0 | 1 | 2 | 3;
interface ReminderState {
  dismissed_3d?: string;
  dismissed_7d?: string;
  dismissed_14d?: string;
}
function tierAtDays(days: number, state: ReminderState): Tier {
  if (days >= 14 && !state.dismissed_14d) return 3;
  if (days >= 7  && !state.dismissed_7d)  return 2;
  if (days >= 3  && !state.dismissed_3d)  return 1;
  return 0;
}

const results: { name: string; passed: boolean; details?: string }[] = [];

function test(name: string, fn: () => void) {
  try { fn(); results.push({ name, passed: true }); }
  catch (err: any) { results.push({ name, passed: false, details: String(err?.message ?? err) }); }
}
function eq<T>(a: T, b: T, msg?: string) {
  if (a !== b) throw new Error(`${msg ?? "eq"}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

test("TIER-01 <3 days → tier 0", () => {
  eq(tierAtDays(0, {}), 0);
  eq(tierAtDays(2, {}), 0);
});

test("TIER-02 3–6 days → tier 1", () => {
  eq(tierAtDays(3, {}), 1);
  eq(tierAtDays(6, {}), 1);
});

test("TIER-03 7–13 days → tier 2", () => {
  eq(tierAtDays(7, {}), 2);
  eq(tierAtDays(13, {}), 2);
});

test("TIER-04 ≥14 days → tier 3", () => {
  eq(tierAtDays(14, {}), 3);
  eq(tierAtDays(45, {}), 3);
});

test("TIER-05 dismissed_3d suppresses tier 1 but not tier 2", () => {
  const state = { dismissed_3d: "2026-06-01T00:00:00Z" };
  eq(tierAtDays(4, state), 0, "tier 1 suppressed");
  eq(tierAtDays(7, state), 2, "tier 2 still fires");
});

test("TIER-06 dismissed_7d suppresses tier 2 but not tier 3", () => {
  const state = { dismissed_3d: "x", dismissed_7d: "y" };
  eq(tierAtDays(4, state), 0);
  eq(tierAtDays(10, state), 0);
  eq(tierAtDays(14, state), 3);
});

test("TIER-07 dismissed_14d suppresses tier 3", () => {
  const state = { dismissed_3d: "x", dismissed_7d: "y", dismissed_14d: "z" };
  eq(tierAtDays(30, state), 0);
});

test("TIER-08 higher tier renders even if lower tier not dismissed", () => {
  // User was on tier 1 (3 days), never dismissed. Then hits tier 2 (7 days).
  // Expected: tier 2 fires — the escalation is more urgent than the
  // undismissed lower tier.
  eq(tierAtDays(7, {}), 2);
  eq(tierAtDays(14, {}), 3);
});

const passed = results.filter(r => r.passed).length;
console.log(`\nGARMIN SYNC TIER TESTS — ${passed}/${results.length} passed`);
console.log("─".repeat(60));
for (const r of results) {
  console.log(`  ${r.passed ? "✓" : "✗"} ${r.name}${r.details ? "  — " + r.details : ""}`);
}
if (results.some(r => !r.passed)) process.exit(1);
