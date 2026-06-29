// Activity × wearable copy matrix for the launch card. Pure mapping function —
// unit-testable in isolation, no React or DOM dependencies.
//
// `phone_only` returns null for every activity type — by design, users with no
// detected wearable don't see the card at all (cleaner pre-start UI; the
// universal phone-tracking button below handles them).

import type { PrimaryWearable } from "@/lib/wearable-detection";

export type LaunchActivityType = "gps" | "structured" | "gym" | "triathlon";

export interface LaunchCopy {
  /** Short heading inside the card */
  title: string;
  /** One- or two-sentence framing */
  body: string;
  /** Optional ordered list of setup steps */
  steps?: string[];
  /** Optional fine-print line at the bottom */
  footer?: string;
}

// Apple Watch is rendered as a button, not an instructional card — so it
// doesn't go in this matrix. The component handles AW separately.
type NonAppleWearable = Exclude<PrimaryWearable, "apple_watch" | "phone_only">;

const GPS: Record<NonAppleWearable, LaunchCopy> = {
  garmin: {
    title: "Track on your Garmin",
    body: "Garmin tracks GPS activities natively — start a Run, Walk, or Bike on your watch and HITT will pick up the route, HR, and pace from Apple Health when you finish.",
    footer: "Works with any Garmin model that syncs to Apple Health.",
  },
  fitbit: {
    title: "Track on your Fitbit",
    body: "Start the activity on your Fitbit and HITT will sync the duration, HR, and calories after. Note: Fitbit doesn't always sync GPS routes via Apple Health, so route maps may be unavailable.",
  },
  whoop: {
    title: "Use phone GPS — Whoop pairs HR",
    body: "Whoop tracks HR and strain throughout but doesn't capture GPS routes. Use HITT phone GPS for the route — your Whoop HR data pairs with it automatically.",
  },
  oura: {
    title: "Use phone GPS — Oura tracks recovery",
    body: "Oura focuses on sleep and recovery rather than live workouts. Use HITT phone GPS for route and pace — your Oura readiness shows alongside the result.",
  },
};

const STRUCTURED: Record<NonAppleWearable, LaunchCopy> = {
  garmin: {
    title: "Garmin doesn't run HITT workouts",
    body: "Structured interval workouts run in the HITT player on your phone, with HR coming from your Garmin via Apple Health. Use the Start button below.",
  },
  fitbit: {
    title: "Fitbit doesn't run HITT workouts",
    body: "Use the HITT player on your phone — Fitbit's HR and calorie data will sync to the workout after.",
  },
  whoop: {
    title: "Use the HITT player on your phone",
    body: "Whoop captures HR and strain in the background. The structured intervals run in the HITT player on your phone — they'll pair automatically.",
  },
  oura: {
    title: "Use the HITT player on your phone",
    body: "Oura doesn't run live workouts. Run the structured intervals in the HITT player — Oura's recovery data shows alongside the result.",
  },
};

const GYM: Record<NonAppleWearable, LaunchCopy> = {
  garmin: {
    title: "Track strength on your Garmin",
    body: "Start a Strength activity on your Garmin to track HR and time. HITT will sync the session after — set rep counts in the timer below.",
  },
  fitbit: {
    title: "Track strength on your Fitbit",
    body: "Start a Strength / Weights activity on your Fitbit. HITT will sync HR and calories — use the timer below for sets and reps.",
  },
  whoop: {
    title: "Whoop tracks HR in the background",
    body: "No setup needed on Whoop — it captures HR throughout. Use the HITT timer below for sets, reps, and rest.",
  },
  oura: {
    title: "Oura tracks recovery, not workouts",
    body: "Use the HITT timer below for the actual session. Oura's recovery score will reflect the effort tomorrow morning.",
  },
};

const TRIATHLON: Record<NonAppleWearable, LaunchCopy> = {
  garmin: {
    title: "Race on your Garmin",
    body: "Garmin handles triathlon transitions natively. Set up the race on your watch and HITT will pick up each leg from Apple Health when you finish.",
    steps: [
      "On your Garmin: hold UP → Activity & Apps → Triathlon",
      "Press START when you're ready to swim",
      "Press LAP to switch swim → bike, then again to switch to run",
    ],
    footer: "Supported on Forerunner 255+, Fenix, Epix, Enduro. Older models (e.g. FR245) don't have native multisport — use the phone GPS option below.",
  },
  fitbit: {
    title: "Fitbit doesn't track multisport",
    body: "Fitbit can track each leg separately but not the full triathlon as one session. Two options:",
    steps: [
      "Use HITT phone GPS (button below) — handles all three legs",
      "Or start swim/bike/run as separate Fitbit activities and we'll group them after",
    ],
  },
  whoop: {
    title: "Whoop doesn't track multisport",
    body: "Whoop captures HR and strain but doesn't structure workouts into legs. Use the HITT phone GPS option below — Whoop's HR and recovery data will still pair with your race in the app.",
  },
  oura: {
    title: "Oura is for recovery, not racing",
    body: "Oura focuses on sleep and recovery rather than live workout tracking. Use the HITT phone GPS option below — your Oura sleep and readiness will surface alongside the race summary.",
  },
};

const MATRIX: Record<LaunchActivityType, Record<NonAppleWearable, LaunchCopy>> = {
  gps: GPS,
  structured: STRUCTURED,
  gym: GYM,
  triathlon: TRIATHLON,
};

// Apple Watch button labels per activity type — kept here so the component
// doesn't have to know about activity-specific naming.
const APPLE_WATCH_LABELS: Record<LaunchActivityType, string> = {
  gps: "Start on Apple Watch",
  structured: "Send to Apple Watch",
  gym: "Start on Apple Watch",
  triathlon: "Start Race on Apple Watch",
};

/**
 * Returns the copy to render in the launch card for a given (activity, wearable) pair.
 *
 * - `phone_only` → null (suppress the card entirely)
 * - `apple_watch` → null (the component renders a button, not an instructional card)
 * - All other vendors → activity-specific copy
 */
export function getLaunchCopy(
  activityType: LaunchActivityType,
  wearable: PrimaryWearable,
): LaunchCopy | null {
  if (wearable === "phone_only" || wearable === "apple_watch") return null;
  return MATRIX[activityType][wearable];
}

export function getAppleWatchLabel(activityType: LaunchActivityType): string {
  return APPLE_WATCH_LABELS[activityType];
}
