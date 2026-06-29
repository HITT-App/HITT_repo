// Unit tests for getPrimaryWearable. Uses a mock supabase client so each
// case runs against a controlled, known dataset — no auth, no live DB,
// no risk of historical test data polluting results.
//
// Usage:
//   npx tsx tests/test-wearable-detection.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getPrimaryWearable,
  type PrimaryWearable,
} from "../src/lib/wearable-detection";

interface SeedRow {
  source_platform: string;
}

// Build the minimum supabase-client surface getPrimaryWearable needs.
// Returns the seeded rows from any .select() chain ending in .not().
function mockSupabase(rows: SeedRow[]): SupabaseClient {
  const result = Promise.resolve({ data: rows, error: null });
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    not: () => result,
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function mockSupabaseError(): SupabaseClient {
  const result = Promise.resolve({ data: null, error: { message: "boom" } });
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    gte: () => chain,
    not: () => result,
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

let pass = 0;
let fail = 0;

function assert(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

interface Case {
  id: string;
  label: string;
  rows: SeedRow[];
  expect: PrimaryWearable;
}

const CASES: Case[] = [
  {
    id: "WD-01",
    label: "3 Garmin + 1 Apple Watch → garmin (vendor dominates)",
    rows: [
      { source_platform: "garmin" },
      { source_platform: "garmin" },
      { source_platform: "garmin" },
      { source_platform: "apple_watch" },
    ],
    expect: "garmin",
  },
  {
    id: "WD-02",
    label: "2 Garmin + 2 Apple Watch → apple_watch (tiebreaker)",
    rows: [
      { source_platform: "garmin" },
      { source_platform: "garmin" },
      { source_platform: "apple_watch" },
      { source_platform: "apple_watch" },
    ],
    expect: "apple_watch",
  },
  {
    id: "WD-03",
    label: "1 Garmin (below ≥2 threshold) and no Apple Watch → phone_only",
    rows: [{ source_platform: "garmin" }],
    expect: "phone_only",
  },
  {
    id: "WD-04",
    label: "Only hitt_phone rows → phone_only (phone never wins)",
    rows: [
      { source_platform: "hitt_phone" },
      { source_platform: "hitt_phone" },
      { source_platform: "hitt_phone" },
    ],
    expect: "phone_only",
  },
  {
    id: "WD-05",
    label: "Brand-new user with zero rows → phone_only",
    rows: [],
    expect: "phone_only",
  },
  {
    id: "WD-06",
    label: "Only unrecognised HealthKit sources → phone_only",
    rows: [
      { source_platform: "healthkit_other" },
      { source_platform: "apple_health_native" },
    ],
    expect: "phone_only",
  },
  // Bonus edge cases the Plan agent prompted
  {
    id: "WD-06b",
    label: "1 Apple Watch + 1 Garmin → apple_watch (AW wins ties)",
    rows: [
      { source_platform: "apple_watch" },
      { source_platform: "garmin" },
    ],
    expect: "apple_watch",
  },
  {
    id: "WD-06c",
    label: "Garmin landslide (10:1) → garmin even with Apple Watch present",
    rows: [
      ...Array.from({ length: 10 }, () => ({ source_platform: "garmin" })),
      { source_platform: "apple_watch" },
    ],
    expect: "garmin",
  },
  {
    id: "WD-06d",
    label: "Mixed phone + 2 Fitbit + nothing else → fitbit (threshold met)",
    rows: [
      { source_platform: "fitbit" },
      { source_platform: "fitbit" },
      { source_platform: "hitt_phone" },
      { source_platform: "hitt_phone" },
    ],
    expect: "fitbit",
  },
];

async function main(): Promise<void> {
  for (const c of CASES) {
    try {
      const result = await getPrimaryWearable(mockSupabase(c.rows), "test-user");
      assert(
        `${c.id}: ${c.label}`,
        result === c.expect,
        `got '${result}', expected '${c.expect}'`,
      );
    } catch (err) {
      assert(`${c.id}: ${c.label}`, false, `threw: ${(err as Error).message}`);
    }
  }

  // Defensive checks — DB error path, empty userId
  try {
    const result = await getPrimaryWearable(mockSupabaseError(), "test-user");
    assert("WD-07a: DB error returns phone_only (no throw)", result === "phone_only", `got '${result}'`);
  } catch (err) {
    assert("WD-07a: DB error returns phone_only (no throw)", false, `threw: ${(err as Error).message}`);
  }

  try {
    const result = await getPrimaryWearable(mockSupabase([]), "");
    assert("WD-07b: empty userId returns phone_only", result === "phone_only", `got '${result}'`);
  } catch (err) {
    assert("WD-07b: empty userId returns phone_only", false, `threw: ${(err as Error).message}`);
  }

  console.log(`\n━━━ ${pass} passed, ${fail} failed ━━━`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
