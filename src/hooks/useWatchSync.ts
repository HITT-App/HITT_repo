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
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

function setLastSync(ts: string) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, ts);
  } catch {}
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
        const { available } = await Health.isHealthAvailable();
        setState((s) => ({ ...s, isAvailable: available }));

        if (available) {
          const perms = await Health.checkHealthPermissions({
            permissions: ["READ_STEPS", "READ_HEART_RATE", "READ_DISTANCE", "READ_CALORIES"],
          });
          const authorized = perms.permissions?.every((p: any) => p.granted) ?? false;
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
      const result = await Health.requestHealthPermissions({
        permissions: ["READ_STEPS", "READ_HEART_RATE", "READ_DISTANCE", "READ_CALORIES"],
      });
      const authorized = result.permissions?.every((p: any) => p.granted) ?? false;
      setState((s) => ({ ...s, isAuthorized: authorized }));

      if (authorized) {
        toast.success("Health data access granted!");
      } else {
        toast.error("Some permissions were denied");
      }
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

      // Steps
      try {
        const stepsResult = await Health.queryAggregated({
          metric: "steps",
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        });
        if (stepsResult.value && stepsResult.value > 0) {
          await logMetric.mutateAsync({
            metric_type: "steps",
            value: Math.round(stepsResult.value),
            unit: "steps",
            notes: "health_connect_sync",
          });
        }
      } catch {}

      // Heart Rate
      try {
        const hrResult = await Health.queryAggregated({
          metric: "heartRate",
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        });
        if (hrResult.value && hrResult.value > 0) {
          await logMetric.mutateAsync({
            metric_type: "heart_rate",
            value: Math.round(hrResult.value),
            unit: "bpm",
            notes: "health_connect_sync",
          });
        }
      } catch {}

      const syncTime = now.toISOString();
      setLastSync(syncTime);
      setState((s) => ({ ...s, isSyncing: false, lastSyncedAt: syncTime }));
      toast.success("Health data synced from your watch!");
    } catch (e: any) {
      setState((s) => ({
        ...s,
        isSyncing: false,
        error: e?.message || "Sync failed",
      }));
      toast.error("Failed to sync health data");
    }
  }, [user, logMetric]);

  return {
    ...state,
    isNative: Capacitor.isNativePlatform(),
    requestPermissions,
    syncHealthData,
  };
}
