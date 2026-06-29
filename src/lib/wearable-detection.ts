// Detect the user's primary wearable from their recent activity history,
// so the Triathlon launch UI (and any future "use your watch" prompts)
// can offer vendor-appropriate instructions instead of an Apple-Watch-only
// button. Driven entirely off activity_logs.source_platform — populated by
// the HealthKit aggregator (sync-healthkit) and the Watch direct path.
//
// Rules:
//   - Only the 5 vendor sources count: apple_watch, garmin, fitbit, whoop, oura.
//   - hitt_phone / apple_health* / healthkit_other are fallback signals, never
//     "primary" — they mean "user tracked via the phone or via unattributed
//     HealthKit data", not "user owns this device".
//   - Apple Watch wins ties (native support, no downside). A non-Apple vendor
//     overrides only when it has STRICTLY more workouts AND ≥2 workouts in
//     the window (one stray import shouldn't change the experience).
//   - No vendor data at all → 'phone_only' (we'll point them at phone GPS).

import type { SupabaseClient } from "@supabase/supabase-js";

export type PrimaryWearable =
  | "apple_watch"
  | "garmin"
  | "fitbit"
  | "whoop"
  | "oura"
  | "phone_only";

export const PRIMARY_WEARABLE_VALUES: readonly PrimaryWearable[] = [
  "apple_watch",
  "garmin",
  "fitbit",
  "whoop",
  "oura",
  "phone_only",
] as const;

const VENDOR_SOURCES = new Set<string>([
  "apple_watch",
  "garmin",
  "fitbit",
  "whoop",
  "oura",
]);

const LOOKBACK_DAYS = 30;
const MIN_NON_APPLE_WORKOUTS = 2;

export async function getPrimaryWearable(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrimaryWearable> {
  if (!userId) return "phone_only";

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { data, error } = await supabase
    .from("activity_logs")
    .select("source_platform")
    .eq("user_id", userId)
    .gte("started_at", since.toISOString())
    .not("source_platform", "is", null);

  if (error || !data || data.length === 0) return "phone_only";

  // Count vendor sources only — phone_only is always the fallback, never a winner.
  const counts = new Map<string, number>();
  for (const row of data) {
    const src = row.source_platform as string | null;
    if (src && VENDOR_SOURCES.has(src)) {
      counts.set(src, (counts.get(src) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return "phone_only";

  const appleCount = counts.get("apple_watch") ?? 0;

  // Find the top non-Apple vendor
  let topVendor: PrimaryWearable = "phone_only";
  let topCount = 0;
  for (const [vendor, count] of counts) {
    if (vendor === "apple_watch") continue;
    if (count > topCount) {
      topCount = count;
      topVendor = vendor as PrimaryWearable;
    }
  }

  // Apple Watch present → wins unless another vendor has strictly more
  // workouts AND meets the ≥2 threshold.
  if (appleCount >= 1) {
    if (topCount > appleCount && topCount >= MIN_NON_APPLE_WORKOUTS) {
      return topVendor;
    }
    return "apple_watch";
  }

  // No Apple Watch — the top non-Apple vendor wins if it meets the threshold.
  if (topCount >= MIN_NON_APPLE_WORKOUTS) return topVendor;
  return "phone_only";
}
