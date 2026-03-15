import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
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

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────
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

  // Check availability on mount (only works in native context)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const { CapacitorHealth } = await import("@capgo/capacitor-health");
        const { available } = await CapacitorHealth.isHealthAvailable();
        setState((s) => ({ ...s, isAvailable: available }));

        if (available) {
          // Check existing permissions
          const perms = await CapacitorHealth.checkHealthPermissions({
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

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error("Watch sync requires the native app");
      return false;
    }

    try {
      const { CapacitorHealth } = await import("@capgo/capacitor-health");
      const result = await CapacitorHealth.requestHealthPermissions({
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

  // Sync health data from watch / phone health store
  const syncHealthData = useCallback(async () => {
    if (!user || !Capacitor.isNativePlatform()) return;

    setState((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      const { CapacitorHealth } = await import("@capgo/capacitor-health");

      // Sync last 24 hours
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // ── Steps ──
      try {
        const stepsResult = await CapacitorHealth.queryAggregated({
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

      // ── Heart Rate ──
      try {
        const hrResult = await CapacitorHealth.queryAggregated({
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

      // ── Distance ──
      try {
        const distResult = await CapacitorHealth.queryAggregated({
          metric: "distance",
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        });
        if (distResult.value && distResult.value > 0) {
          // distance comes in meters, convert to km for display
          await logMetric.mutateAsync({
            metric_type: "distance",
            value: Math.round(distResult.value) / 1000,
            unit: "km",
            notes: "health_connect_sync",
          });
        }
      } catch {}

      // ── Calories ──
      try {
        const calResult = await CapacitorHealth.queryAggregated({
          metric: "calories",
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
        });
        if (calResult.value && calResult.value > 0) {
          await logMetric.mutateAsync({
            metric_type: "calories",
            value: Math.round(calResult.value),
            unit: "kcal",
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
