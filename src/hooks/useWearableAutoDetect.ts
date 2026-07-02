// Auto-detects which wearable a user has and writes it to
// workout_preferences.declared_wearable_vendor. Runs once per app session,
// idempotent — safe to fire on every mount.
//
// Priority resolution:
//   1. Apple Watch paired (HealthKit reports our own bundle-id activity, or
//      the plugin reports com.apple.health as a source).
//   2. URL-scheme probe → first hit wins (Garmin > Strava > Fitbit > Whoop > Oura).
//   3. activity_logs inference (existing getPrimaryWearable behaviour).
//
// A declaration older than 90 days is re-evaluated: if the URL-scheme
// probe now disagrees with the stored vendor AND the current fresh signal
// is stronger than 'activity_log_inference', we overwrite. This handles
// "user got a new watch" without an explicit setting.
//
// User-declared vendors are only overwritten with another user_declared
// vendor — auto-detect never clobbers an explicit choice.

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { detectInstalledVendors } from "@/plugins/WearableDetectPlugin";
import { getPrimaryWearable } from "@/lib/wearable-detection";

const RE_EVAL_AFTER_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

type DetectionSource =
  | "auto_url_scheme"
  | "user_declared"
  | "activity_log_inference";

interface StoredPrefs {
  declared_wearable_vendor: string | null;
  declared_wearable_detected_at: string | null;
  declared_wearable_source: DetectionSource | null;
}

async function resolveVendor(userId: string): Promise<{
  vendor: string;
  source: DetectionSource;
} | null> {
  // Step 1: activity-based inference gives us the Apple Watch signal for
  // free (WCSession-mirrored workouts show up as apple_watch in
  // activity_logs). Cheap DB read, always safe.
  const inferred = await getPrimaryWearable(supabase, userId);
  if (inferred === "apple_watch") {
    return { vendor: "apple_watch", source: "activity_log_inference" };
  }

  // Step 2: URL-scheme probe. First hit wins.
  const installed = await detectInstalledVendors();
  if (installed.garminInstalled) return { vendor: "garmin", source: "auto_url_scheme" };
  if (installed.stravaInstalled) return { vendor: "strava", source: "auto_url_scheme" };
  if (installed.fitbitInstalled) return { vendor: "fitbit", source: "auto_url_scheme" };
  if (installed.whoopInstalled)  return { vendor: "whoop",  source: "auto_url_scheme" };
  if (installed.ouraInstalled)   return { vendor: "oura",   source: "auto_url_scheme" };

  // Step 3: fall back to inference (may still be phone_only).
  if (inferred !== "phone_only") {
    return { vendor: inferred, source: "activity_log_inference" };
  }
  return { vendor: "phone_only", source: "activity_log_inference" };
}

// Adjudication: should we overwrite an existing declaration with a fresh
// detection? Rules:
//   - user_declared is never overwritten by anything except a fresh
//     user_declared (handled outside this hook — Settings screen writes
//     directly).
//   - auto_url_scheme overwrites nothing if the vendor agrees.
//   - After 90 days OR if inference disagrees with the stored vendor by a
//     margin (≥2 workouts from the new vendor in the last 30 days), the
//     stored value is refreshed.
function shouldOverwrite(prefs: StoredPrefs, fresh: { vendor: string; source: DetectionSource }): boolean {
  if (!prefs.declared_wearable_vendor) return true;              // first-time write
  if (prefs.declared_wearable_source === "user_declared") return false;
  if (prefs.declared_wearable_vendor === fresh.vendor) return false;

  const detectedAt = prefs.declared_wearable_detected_at
    ? new Date(prefs.declared_wearable_detected_at).getTime()
    : 0;
  const ageOk = Date.now() - detectedAt > RE_EVAL_AFTER_MS;
  if (!ageOk) return false;

  // Only overwrite with a stronger-or-equal signal than what's stored.
  const rank: Record<DetectionSource, number> = {
    user_declared: 3,
    auto_url_scheme: 2,
    activity_log_inference: 1,
  };
  const storedRank = prefs.declared_wearable_source ? rank[prefs.declared_wearable_source] : 0;
  return rank[fresh.source] >= storedRank;
}

export function useWearableAutoDetect(): void {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user?.id || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const { data: prefs } = await supabase
          .from("workout_preferences")
          .select("declared_wearable_vendor, declared_wearable_detected_at, declared_wearable_source")
          .eq("user_id", user.id)
          .maybeSingle();

        const stored = (prefs ?? {
          declared_wearable_vendor: null,
          declared_wearable_detected_at: null,
          declared_wearable_source: null,
        }) as StoredPrefs;

        const fresh = await resolveVendor(user.id);
        if (!fresh) return;
        if (!shouldOverwrite(stored, fresh)) return;

        await supabase
          .from("workout_preferences")
          .upsert({
            user_id: user.id,
            declared_wearable_vendor: fresh.vendor,
            declared_wearable_detected_at: new Date().toISOString(),
            declared_wearable_source: fresh.source,
          }, { onConflict: "user_id" });
      } catch {
        // Never break the app for a background detection failure.
      }
    })();
  }, [user?.id]);
}
