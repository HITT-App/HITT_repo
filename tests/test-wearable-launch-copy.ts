// Unit tests for the wearable launch copy matrix. Validates that every
// (activityType, wearable) combination has either a non-empty copy entry
// or returns null by design.
//
// Usage:
//   npx tsx tests/test-wearable-launch-copy.ts

import {
  getLaunchCopy,
  getAppleWatchLabel,
  type LaunchActivityType,
} from "../src/lib/wearable-launch-copy";
import type { PrimaryWearable } from "../src/lib/wearable-detection";

const ACTIVITIES: LaunchActivityType[] = ["gps", "structured", "gym", "triathlon"];
const ALL_WEARABLES: PrimaryWearable[] = [
  "apple_watch", "garmin", "fitbit", "whoop", "oura", "phone_only",
];

let pass = 0;
let fail = 0;
function assert(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { fail++; console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ""}`); }
}

function isNonEmpty(s: unknown): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

// WD-11: Matrix completeness — every non-Apple, non-phone-only wearable has
// non-empty title + body for every activity type.
for (const activity of ACTIVITIES) {
  for (const wearable of ALL_WEARABLES) {
    const copy = getLaunchCopy(activity, wearable);
    if (wearable === "phone_only" || wearable === "apple_watch") {
      assert(
        `WD-11: ${activity} × ${wearable} → null (suppress / button-rendered separately)`,
        copy === null,
        `got ${copy === null ? "null" : "non-null"}`,
      );
    } else {
      const ok = copy !== null && isNonEmpty(copy.title) && isNonEmpty(copy.body);
      assert(
        `WD-11: ${activity} × ${wearable} → non-empty title + body`,
        ok,
        copy ? `title="${copy.title}" body="${copy.body.slice(0, 30)}…"` : "got null",
      );
    }
  }
}

// WD-12: Apple Watch label is non-empty for every activity type — the
// component renders this string on the button.
for (const activity of ACTIVITIES) {
  const label = getAppleWatchLabel(activity);
  assert(
    `WD-12: AW label for ${activity} is non-empty ("${label}")`,
    isNonEmpty(label),
    `got "${label}"`,
  );
}

// WD-13: phone_only is explicitly null for every activity (clean-UI contract).
for (const activity of ACTIVITIES) {
  const copy = getLaunchCopy(activity, "phone_only");
  assert(
    `WD-13: phone_only is suppressed for ${activity} (null returned)`,
    copy === null,
  );
}

console.log(`\n━━━ ${pass} passed, ${fail} failed ━━━`);
process.exit(fail === 0 ? 0 : 1);
