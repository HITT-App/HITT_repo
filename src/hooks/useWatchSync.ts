import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { getSportConfig, validateWatchHR, type SportConfig } from "@/lib/sports";

interface SyncState {
  isAvailable: boolean;
  isAuthorized: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  watchType: string | null;
  syncFrequency: "manual" | "on_open" | "hourly";
  lastSyncResults: SyncResults | null;
}

export interface SyncResults {
  steps?: number;
  heartRate?: number;
  distance?: number;
  calories?: number;
  hrAccuracy?: "excellent" | "good" | "low";
  activeSport?: string;
}

const LAST_SYNC_KEY = "hiit-watch-last-sync";
const WATCH_TYPE_KEY = "hiit-watch-type";
const SYNC_FREQ_KEY = "hiit-sync-frequency";
const SYNC_RESULTS_KEY = "hiit-watch-last-results";

function getLastSync(): string | null {
  try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; }
}
function setLastSync(ts: string) {
  try { localStorage.setItem(LAST_SYNC_KEY, ts); } catch {}
}
function getSavedResults(): SyncResults | null {
  try {
    const s = localStorage.getItem(SYNC_RESULTS_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

const WATCH_TYPES = [
  { id: "apple_watch", label: "Apple Watch", platform: "ios" },
  { id: "galaxy_watch", label: "Samsung Galaxy Watch", platform: "android" },
  { id: "pixel_watch", label: "Google Pixel Watch", platform: "android" },
  { id: "fitbit", label: "Fitbit (via Health Connect)", platform: "android" },
  { id: "garmin", label: "Garmin (via Health Connect)", platform: "android" },
  { id: "other", label: "Other", platform: "both" },
] as const;

export type WatchType = typeof WATCH_TYPES[number]["id"];

export function useWatchSync() {
  const { user } = useAuth();
  const { logMetric } = useHealthMetrics();

  const [state, setState] = useState<SyncState>({
    isAvailable: false,
    isAuthorized: false,
    isSyncing: false,
    lastSyncedAt: getLastSync(),
    error: null,
    watchType: localStorage.getItem(WATCH_TYPE_KEY) || null,
    syncFrequency: (localStorage.getItem(SYNC_FREQ_KEY) as SyncState["syncFrequency"]) || "manual",
    lastSyncResults: getSavedResults(),
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    (async () => {
      try {
        const { Health } = await import("@capgo/capacitor-health");
        const { available } = await Health.isAvailable();
        setState((s) => ({ ...s, isAvailable: available }));
        if (available) {
          const status = await Health.checkAuthorization({
            read: ["steps", "heartRate", "distance", "calories"],
          });
          const authorized = status.readAuthorized.length >= 4;
          setState((s) => ({ ...s, isAuthorized: authorized }));
        }
      } catch {
        setState((s) => ({ ...s, isAvailable: false }));
      }
    })();
  }, []);

  // Auto-sync on open if configured
  useEffect(() => {
    if (state.syncFrequency === "on_open" && state.isAuthorized && user && Capacitor.isNativePlatform()) {
      const lastSync = getLastSync();
      const threshold = 5 * 60 * 1000;
      if (!lastSync || Date.now() - new Date(lastSync).getTime() > threshold) {
        syncHealthData();
      }
    }
  }, [state.isAuthorized, state.syncFrequency, user]);

  const setWatchType = useCallback(async (type: WatchType) => {
    localStorage.setItem(WATCH_TYPE_KEY, type);
    setState((s) => ({ ...s, watchType: type }));
    if (user) {
      await supabase.from("profiles").update({ watch_type: type } as any).eq("user_id", user.id);
    }
  }, [user]);

  const setSyncFrequency = useCallback((freq: SyncState["syncFrequency"]) => {
    localStorage.setItem(SYNC_FREQ_KEY, freq);
    setState((s) => ({ ...s, syncFrequency: freq }));
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error("Watch sync requires the native app");
      return false;
    }
    try {
      const { Health } = await import("@capgo/capacitor-health");
      const status = await Health.requestAuthorization({
        read: ["steps", "heartRate", "distance", "calories"],
      });
      const authorized = status.readAuthorized.length >= 4;
      setState((s) => ({ ...s, isAuthorized: authorized }));
      if (authorized) toast.success("Health data access granted!");
      else toast.error("Some permissions were denied");
      return authorized;
    } catch (e: any) {
      toast.error(e?.message || "Permission request failed");
      return false;
    }
  }, []);

  const syncHealthData = useCallback(async (activeSportName?: string) => {
    if (!user || !Capacitor.isNativePlatform()) return;
    setState((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      const { Health } = await import("@capgo/capacitor-health");
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const opts = { startDate: startDate.toISOString(), endDate: now.toISOString(), bucket: "day" as const };

      const results: SyncResults = {};
      if (activeSportName) results.activeSport = activeSportName;

      // Steps
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "steps" });
        const total = samples.reduce((s, b) => s + b.value, 0);
        if (total > 0) {
          await logMetric.mutateAsync({ metric_type: "steps", value: Math.round(total), unit: "steps", notes: "watch_sync" });
          results.steps = Math.round(total);
        }
      } catch {}

      // Heart Rate (average)
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "heartRate", aggregation: "average" });
        if (samples.length > 0 && samples[0].value > 0) {
          const avgHR = Math.round(samples[0].value);
          await logMetric.mutateAsync({ metric_type: "heart_rate", value: avgHR, unit: "bpm", notes: "watch_sync" });
          results.heartRate = avgHR;

          // Validate HR against active sport if provided
          if (activeSportName) {
            const validation = validateWatchHR(activeSportName, avgHR);
            results.hrAccuracy = validation.accuracy;
          }
        }
      } catch {}

      // Distance
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "distance" });
        const totalKm = samples.reduce((s, b) => s + b.value, 0) / 1000;
        if (totalKm > 0) {
          results.distance = Math.round(totalKm * 100) / 100;
        }
      } catch {}

      // Active Calories
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "calories" });
        const totalCal = samples.reduce((s, b) => s + b.value, 0);
        if (totalCal > 0) {
          results.calories = Math.round(totalCal);
        }
      } catch {}

      const syncTime = now.toISOString();
      setLastSync(syncTime);
      try { localStorage.setItem(SYNC_RESULTS_KEY, JSON.stringify(results)); } catch {}

      setState((s) => ({ ...s, isSyncing: false, lastSyncedAt: syncTime, lastSyncResults: results }));
      
      const syncedItems = Object.keys(results).filter(k => k !== "activeSport" && k !== "hrAccuracy").length;
      
      if (results.hrAccuracy) {
        const hrMsg = results.hrAccuracy === "excellent" ? "🎯 HR calibration: perfect"
          : results.hrAccuracy === "good" ? "✅ HR calibration: good"
          : "⚠️ HR calibration: check watch fit";
        toast.success(`Synced ${syncedItems} metrics · ${hrMsg}`);
      } else {
        toast.success(`Synced ${syncedItems} metric${syncedItems !== 1 ? "s" : ""} from your watch!`);
      }
    } catch (e: any) {
      setState((s) => ({ ...s, isSyncing: false, error: e?.message || "Sync failed" }));
      toast.error("Failed to sync health data");
    }
  }, [user, logMetric]);

  return {
    ...state,
    isNative: Capacitor.isNativePlatform(),
    requestPermissions,
    syncHealthData,
    setWatchType,
    setSyncFrequency,
    watchTypes: WATCH_TYPES,
  };
}
