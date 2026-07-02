// Client-side "days since last garmin sync" tier resolver.
//
// No cron, no push notifications — the banner tier is derived every time
// the home screen mounts from workout_preferences + activity_logs:
//
//   Tier 0  →  not a garmin user OR synced recently → nothing to show
//   Tier 1  →  ≥3 days no sync → soft nudge banner
//   Tier 2  →  ≥7 days no sync → escalated banner + push-to-Setup Sheet
//   Tier 3  →  ≥14 days no sync → "switch to phone GPS" offer
//
// Each tier is dismissible independently; the dismissal ledger lives in
// workout_preferences.garmin_setup_reminder_state so it survives reinstall.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type GarminSyncTier = 0 | 1 | 2 | 3;

export interface GarminSyncStatus {
  tier: GarminSyncTier;
  daysSinceLastSync: number | null;
  loading: boolean;
  dismissCurrentTier: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface ReminderState {
  dismissed_3d?: string;
  dismissed_7d?: string;
  dismissed_14d?: string;
  last_seen_at?: string;
}

const TIER_KEYS: Record<Exclude<GarminSyncTier, 0>, keyof ReminderState> = {
  1: "dismissed_3d",
  2: "dismissed_7d",
  3: "dismissed_14d",
};

// Reset a lower tier's dismissal when the user climbs to a higher tier —
// they've already dismissed "3 days" but now it's been 7 days; they
// should see the escalated message once.
function tierAtDays(days: number, state: ReminderState): GarminSyncTier {
  if (days >= 14 && !state.dismissed_14d) return 3;
  if (days >= 7  && !state.dismissed_7d)  return 2;
  if (days >= 3  && !state.dismissed_3d)  return 1;
  return 0;
}

export function useGarminSyncStatus(): GarminSyncStatus {
  const { user } = useAuth();
  const [tier, setTier] = useState<GarminSyncTier>(0);
  const [daysSinceLastSync, setDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminderState, setReminderState] = useState<ReminderState>({});

  const resolve = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [prefsRes, activityRes] = await Promise.all([
        supabase
          .from("workout_preferences")
          .select("declared_wearable_vendor, declared_wearable_source, garmin_setup_reminder_state")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("activity_logs")
          .select("started_at")
          .eq("user_id", user.id)
          .eq("source_platform", "garmin")
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      const prefs = prefsRes.data;
      const state = (prefs?.garmin_setup_reminder_state ?? {}) as ReminderState;
      setReminderState(state);

      if (prefs?.declared_wearable_vendor !== "garmin") {
        setTier(0);
        setDays(null);
        return;
      }

      const lastSync = activityRes.data?.[0]?.started_at;
      if (!lastSync) {
        // Declared garmin, never synced — treat "days since detection" as
        // the age of the declaration. Compute from declared_wearable_detected_at.
        const { data: detectAt } = await supabase
          .from("workout_preferences")
          .select("declared_wearable_detected_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!detectAt?.declared_wearable_detected_at) {
          setTier(0);
          setDays(null);
          return;
        }
        const ageDays = (Date.now() - new Date(detectAt.declared_wearable_detected_at).getTime()) / (24 * 3600 * 1000);
        const rounded = Math.floor(ageDays);
        setDays(rounded);
        setTier(tierAtDays(rounded, state));
        return;
      }

      const ageDays = (Date.now() - new Date(lastSync).getTime()) / (24 * 3600 * 1000);
      const rounded = Math.floor(ageDays);
      setDays(rounded);
      setTier(tierAtDays(rounded, state));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const dismissCurrentTier = useCallback(async () => {
    if (!user?.id || tier === 0) return;
    const key = TIER_KEYS[tier];
    const patchState: ReminderState = { ...reminderState, [key]: new Date().toISOString() };
    setReminderState(patchState);
    setTier(0); // hide immediately; resolve() runs again on next mount
    await supabase
      .from("workout_preferences")
      .upsert({
        user_id: user.id,
        garmin_setup_reminder_state: patchState,
      }, { onConflict: "user_id" });
  }, [tier, reminderState, user?.id]);

  return { tier, daysSinceLastSync, loading, dismissCurrentTier, refresh: resolve };
}
