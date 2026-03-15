import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

interface SyncState {
  isAvailable: boolean;
  isAuthorized: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

const LAST_SYNC_KEY = "hiit-watch-last-sync";

function getLastSync(): string | null {
  try { return localStorage.getItem(LAST_SYNC_KEY); } catch { return null; }
}
function setLastSync(ts: string) {
  try { localStorage.setItem(LAST_SYNC_KEY, ts); } catch {}
}

export function useWatchSync() {
  const { user } = useAuth();
  const { logMetric } = useHealthMetrics();

  const [state, setState] = useState<SyncState>({
    isAvailable: false,
    isAuthorized: false,
    isSyncing: false,
    lastSyncedAt: getLastSync(),
    error: null,
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

  const syncHealthData = useCallback(async () => {
    if (!user || !Capacitor.isNativePlatform()) return;
    setState((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      const { Health } = await import("@capgo/capacitor-health");
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const opts = { startDate: startDate.toISOString(), endDate: now.toISOString(), bucket: "day" as const };

      // Steps
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "steps" });
        const total = samples.reduce((s, b) => s + b.value, 0);
        if (total > 0) {
          await logMetric.mutateAsync({ metric_type: "steps", value: Math.round(total), unit: "steps", notes: "health_connect_sync" });
        }
      } catch {}

      // Heart Rate (average)
      try {
        const { samples } = await Health.queryAggregated({ ...opts, dataType: "heartRate", aggregation: "average" });
        if (samples.length > 0 && samples[0].value > 0) {
          await logMetric.mutateAsync({ metric_type: "heart_rate", value: Math.round(samples[0].value), unit: "bpm", notes: "health_connect_sync" });
        }
      } catch {}

      const syncTime = now.toISOString();
      setLastSync(syncTime);
      setState((s) => ({ ...s, isSyncing: false, lastSyncedAt: syncTime }));
      toast.success("Health data synced from your watch!");
    } catch (e: any) {
      setState((s) => ({ ...s, isSyncing: false, error: e?.message || "Sync failed" }));
      toast.error("Failed to sync health data");
    }
  }, [user, logMetric]);

  return { ...state, isNative: Capacitor.isNativePlatform(), requestPermissions, syncHealthData };
}
