// Canonical activity_type enum shared by every ingest path.
//
// The dedupe fingerprint in activity-upsert.ts includes activity_type in its
// hash input, so if two paths label the same real-world workout with
// different strings ("run" vs "running") the fingerprints don't collide and
// we end up with duplicate rows.
//
// Every value written to activity_logs.activity_type MUST go through
// normaliseActivityType() first. Add a new canonical value only when a real
// user-facing surface needs to distinguish it — otherwise map into "other".

export type CanonicalActivityType =
  | "running"
  | "walking"
  | "cycling"
  | "swimming"
  | "hiking"
  | "rowing"
  | "yoga"
  | "strength"
  | "hiit"
  | "pilates"
  | "cross_training"
  | "elliptical"
  | "stairs"
  | "dance"
  | "cardio"
  | "triathlon"
  | "other";

export const CANONICAL_ACTIVITY_TYPES: readonly CanonicalActivityType[] = [
  "running", "walking", "cycling", "swimming", "hiking", "rowing", "yoga",
  "strength", "hiit", "pilates", "cross_training", "elliptical", "stairs",
  "dance", "cardio", "triathlon", "other",
] as const;

// Source-string → canonical. Left side matches lower-cased, punctuation-stripped
// input. Anything not matched falls through to "other".
const ALIASES: Record<string, CanonicalActivityType> = {
  // running family
  run: "running", running: "running", jog: "running", jogging: "running",
  trailrun: "running", trailrunning: "running", roadrun: "running",
  // walking family
  walk: "walking", walking: "walking", stroll: "walking",
  // cycling family
  bike: "cycling", biking: "cycling", cycle: "cycling", cycling: "cycling",
  ride: "cycling", ebike: "cycling", mountainbike: "cycling", mtb: "cycling",
  roadcycling: "cycling", indoorcycling: "cycling", spin: "cycling", spinning: "cycling",
  // swimming family
  swim: "swimming", swimming: "swimming", opnwaterswim: "swimming",
  poolswim: "swimming", openwaterswim: "swimming", lapswim: "swimming",
  // strength family — Garmin FIT sub_sport values collapse here
  strength: "strength", strengthtraining: "strength",
  weight: "strength", weights: "strength", lifting: "strength",
  weightlifting: "strength", weighttraining: "strength",
  functionalstrengthtraining: "strength", traditionalstrengthtraining: "strength",
  // hiit family
  hiit: "hiit", highintensityintervaltraining: "hiit",
  intervaltraining: "hiit", intervals: "hiit", tabata: "hiit",
  cardiotraining: "hiit",  // Garmin's SUB_SPORT_CARDIO_TRAINING
  // yoga family
  yoga: "yoga", pilates: "pilates",
  // hiking family
  hike: "hiking", hiking: "hiking", trek: "hiking", trekking: "hiking",
  // rowing family
  row: "rowing", rowing: "rowing", indoorrowing: "rowing", erg: "rowing",
  // elliptical
  elliptical: "elliptical", crosstrainer: "elliptical",
  // stairs
  stairs: "stairs", stairclimbing: "stairs", stairstepper: "stairs",
  // dance
  dance: "dance", dancing: "dance", zumba: "dance",
  // cardio (generic)
  cardio: "cardio", mixedcardio: "cardio",
  // cross training
  crosstraining: "cross_training", crossfit: "cross_training",
  // triathlon
  triathlon: "triathlon", multisport: "triathlon", swimbikerun: "triathlon",
};

// Return the canonical activity_type for whatever raw input we got. Empty /
// null / unknown falls through to "other" so the fingerprint stays stable.
export function normaliseActivityType(raw: string | null | undefined): CanonicalActivityType {
  if (!raw) return "other";
  const key = String(raw).trim().toLowerCase().replace(/[\s_\-]/g, "");
  if (!key) return "other";
  const canonical = ALIASES[key];
  if (canonical) return canonical;
  // If the raw value is already one of the canonical strings (e.g. arriving
  // from the iOS HealthKit plugin which already normalises), pass through.
  if ((CANONICAL_ACTIVITY_TYPES as readonly string[]).includes(key)) {
    return key as CanonicalActivityType;
  }
  return "other";
}

// Source-platform priority. Higher wins when two paths deliver the same
// real-world workout (see activity-upsert.ts winner-selection). Add new
// sources here — anything unlisted defaults to 0 (never wins).
//
// Rationale for ranking:
// - Our own direct pushes (hitt_watch, hitt_garmin_watch) are the highest
//   trust — the vendor watch talks straight to our backend with the full
//   payload we designed for.
// - Vendor-native paths via HealthKit (apple_watch, garmin, fitbit, …)
//   come next. They're accurate but may lack fields we care about.
// - Apple Health "native" (iPhone-tracked) and our phone GPS are lower —
//   they're the fallbacks when nothing better is available.
// - healthkit_other is unknown — always loses to anything else.
export const SOURCE_PRIORITY: Record<string, number> = {
  hitt_watch: 100,
  hitt_garmin_watch: 100,
  apple_watch: 80,
  garmin: 70,
  fitbit: 60,
  whoop: 60,
  oura: 60,
  polar: 60,
  suunto: 60,
  coros: 60,
  wahoo: 60,
  apple_health_native: 40,
  hitt_phone: 20,
  healthkit_other: 5,
};

export function sourcePriority(sourcePlatform: string): number {
  return SOURCE_PRIORITY[sourcePlatform] ?? 0;
}

// Fuzzy-match window (seconds) used by cross-source dedupe. See
// activity-upsert.ts. A workout arriving via BOTH direct push AND the
// HealthKit-mediated path can have a start_time skew of a couple of
// minutes: Garmin Connect uploads to Apple Health with a slight delay
// and sometimes stamps the HKWorkout.startDate with the upload time
// rather than the true activity start. 180s (three minutes) is well
// outside any plausible skew for a real duplicate but still short of a
// plausible back-to-back workout.
export const FUZZY_MATCH_WINDOW_SECONDS = 180;
