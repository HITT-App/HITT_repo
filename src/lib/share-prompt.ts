// Auto-prompts the user to share newly-synced wearable activities. Fires from
// healthkit-sync.ts after a successful sync that produced inserted rows.
//
// Behaviour summary (see docs/specs/SCOPE_new_activity_share_prompt.md):
//
//  - "New" = activity ended after localStorage `hitt_last_share_check_at`
//    (a marker we advance every time we run this check). Hard ceiling 14 days
//    so a user returning after months doesn't get bombarded with ancient stuff.
//  - Once per app session (sessionStorage flag).
//  - Filter to wearable sources only — iPhone HITT workouts already trigger
//    the WorkoutPlayer share flow; Apple Health generic noise is silenced.
//  - Multiple new activities: show the newest in the primary toast + a
//    follow-up secondary toast linking to Activity History for the rest.

import { toast } from "sonner";

const SESSION_FLAG       = "hitt_share_prompt_shown";
const LAST_CHECK_KEY     = "hitt_last_share_check_at";
const MAX_LOOKBACK_DAYS  = 14;
const SHAREABLE_SOURCES  = new Set([
  "garmin", "fitbit", "whoop", "oura", "wahoo", "polar", "coros",
  "apple_watch",
]);

export interface InsertedActivity {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  calories_burned?: number | null;
  source_platform: string;
}

const SOURCE_LABEL: Record<string, string> = {
  garmin: "Garmin",
  fitbit: "Fitbit",
  whoop: "Whoop",
  oura: "Oura",
  wahoo: "Wahoo",
  polar: "Polar",
  coros: "Coros",
  apple_watch: "Apple Watch",
};

const ACTIVITY_EMOJI: Record<string, string> = {
  running: "🏃",
  jogging: "🏃",
  walking: "🚶",
  cycling: "🚴",
  swimming: "🏊",
  hiit: "⚡",
  strength: "💪",
  yoga: "🧘",
  hiking: "🥾",
  rowing: "🚣",
};

function displaySource(s: string): string {
  return SOURCE_LABEL[s] ?? s;
}

function emojiFor(activityType: string): string {
  const key = activityType?.toLowerCase().replace(/\s+/g, "_") ?? "";
  return ACTIVITY_EMOJI[key] ?? "🏆";
}

function displayTitle(activityType: string): string {
  // "running" → "Run", "lap_swimming" → "Swim", etc.
  const map: Record<string, string> = {
    running: "Run", jogging: "Jog", walking: "Walk",
    cycling: "Ride", swimming: "Swim", hiit: "HIIT",
    strength: "Strength", yoga: "Yoga", hiking: "Hike",
    rowing: "Row",
  };
  const key = activityType?.toLowerCase() ?? "";
  return map[key] ?? activityType ?? "Workout";
}

function formatStats(a: InsertedActivity): string {
  const mins = Math.max(1, Math.round(a.duration_seconds / 60));
  const cals = a.calories_burned ?? 0;
  return `${mins} min · ${cals} kcal`;
}

export function maybePromptShareForNewActivity(inserted: InsertedActivity[]): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_FLAG)) return;

  const now = Date.now();
  const maxLookbackMs = MAX_LOOKBACK_DAYS * 86_400_000;
  const lastCheckRaw = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheck = lastCheckRaw ? new Date(lastCheckRaw).getTime() : now - maxLookbackMs;
  const floor = Math.max(lastCheck, now - maxLookbackMs);

  const candidates = inserted
    .filter(a =>
      SHAREABLE_SOURCES.has(a.source_platform) &&
      new Date(a.ended_at ?? a.started_at).getTime() > floor &&
      (a.duration_seconds ?? 0) >= 60 &&
      (a.calories_burned ?? 0) > 0,
    )
    .sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at));

  // Advance the marker even if we don't prompt — protects against re-prompting
  // a row that just barely missed the filter on the next sync.
  localStorage.setItem(LAST_CHECK_KEY, new Date(now).toISOString());

  if (candidates.length === 0) return;
  sessionStorage.setItem(SESSION_FLAG, "1");

  const winner = candidates[0];
  const extra = candidates.length - 1;

  const title = extra === 0
    ? `New activity from ${displaySource(winner.source_platform)}`
    : `Welcome back — ${candidates.length} new activities synced`;

  const description = `${emojiFor(winner.activity_type)} ${displayTitle(winner.activity_type)} · ${formatStats(winner)}`;

  toast(title, {
    description,
    duration: 10_000,
    action: {
      label: extra === 0 ? "Share" : "Share this",
      onClick: () => {
        window.dispatchEvent(new CustomEvent("hitt:open-jarvis-share", {
          detail: {
            workoutId: winner.id,
            workoutTitle: displayTitle(winner.activity_type),
            durationMin: Math.max(1, Math.round(winner.duration_seconds / 60)),
            calories: winner.calories_burned ?? 0,
          },
        }));
      },
    },
  });

  // If there's more than one, stack a follow-up toast routing to Activity
  // History. Kept separate so the primary toast stays clean (sonner only
  // supports one primary action button).
  if (extra > 0) {
    setTimeout(() => {
      toast.message(`+${extra} more activit${extra === 1 ? "y" : "ies"} since last visit`, {
        duration: 10_000,
        action: {
          label: "Browse all →",
          onClick: () => {
            // Hash routing safe across both React Router setups
            window.location.href = "/activity-history";
          },
        },
      });
    }, 600);
  }
}
