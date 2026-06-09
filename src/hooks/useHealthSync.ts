import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Health } from "@capgo/capacitor-health";
import type { HealthDataType, HealthSample } from "@capgo/capacitor-health";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";


const SYNC_WINDOW_HOURS = 48;

const READ_TYPES: HealthDataType[] = [
  "steps",
  "heartRate",
  "restingHeartRate",
  "sleep",
  "weight",
  "bodyFat",
  "oxygenSaturation",
  "workouts",
  "totalCalories",
];

const WRITE_TYPES: HealthDataType[] = ["workouts"];

const METRIC_MAP: Partial<Record<HealthDataType, { metric_type: string; unit: string }>> = {
  steps: { metric_type: "steps", unit: "count" },
  heartRate: { metric_type: "heart_rate", unit: "bpm" },
  restingHeartRate: { metric_type: "resting_heart_rate", unit: "bpm" },
  weight: { metric_type: "weight", unit: "kg" },
  bodyFat: { metric_type: "body_fat", unit: "%" },
  oxygenSaturation: { metric_type: "oxygen_saturation", unit: "%" },
  totalCalories: { metric_type: "calories", unit: "kcal" },
};

function platformLabel(): "healthkit" | "healthconnect" | null {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "healthkit";
  if (p === "android") return "healthconnect";
  return null;
}

export function useHealthSync() {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    const p = Capacitor.getPlatform();
    if (p === "web") return;
    Health.isAvailable()
      .then((r) => setAvailable(r.available))
      .catch(() => setAvailable(false));
  }, []);

  const checkAuthorization = useCallback(async () => {
    if (!available) return false;
    try {
      const status = await Health.checkAuthorization({ read: READ_TYPES });
      const ok = status.readAuthorized.length > 0;
      setAuthorized(ok);
      return ok;
    } catch {
      return false;
    }
  }, [available]);

  useEffect(() => {
    if (available) checkAuthorization();
  }, [available, checkAuthorization]);

  const requestAuthorization = useCallback(async () => {
    if (!available) return false;
    try {
      const status = await Health.requestAuthorization({
        read: READ_TYPES,
        write: WRITE_TYPES,
      });
      const ok = status.readAuthorized.length > 0;
      setAuthorized(ok);
      return ok;
    } catch (err) {
      console.error("useHealthSync: requestAuthorization failed", err);
      return false;
    }
  }, [available]);

  const syncRecent = useCallback(async () => {
    if (!user || !available || !authorized || syncing) return;
    const platform = platformLabel();
    if (!platform) return;

    setSyncing(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - SYNC_WINDOW_HOURS * 3600 * 1000);
      const startISO = startDate.toISOString();
      const endISO = now.toISOString();

      // Simple numeric metrics (steps, heart rate, weight, etc.)
      for (const dataType of Object.keys(METRIC_MAP) as HealthDataType[]) {
        const mapping = METRIC_MAP[dataType];
        if (!mapping) continue;
        const result = await Health.readSamples({
          dataType,
          startDate: startISO,
          endDate: endISO,
          limit: 1000,
        }).catch(() => ({ samples: [] as HealthSample[] }));

        if (!result.samples?.length) continue;

        const rows = result.samples
          .filter((s) => s.platformId)
          .map((s) => ({
            user_id: user.id,
            metric_type: mapping.metric_type,
            value: s.value,
            unit: mapping.unit,
            recorded_at: s.startDate,
            source_platform: platform,
            source_platform_id: s.platformId!,
          }));

        if (rows.length === 0) continue;

        await supabase
          .from("health_metrics")
          .upsert(rows, {
            onConflict: "user_id,source_platform,source_platform_id",
            ignoreDuplicates: false,
          });
      }

      // Sleep — aggregate per night from stage-by-stage samples
      const sleepResult = await Health.readSamples({
        dataType: "sleep",
        startDate: startISO,
        endDate: endISO,
        limit: 500,
      }).catch(() => ({ samples: [] as HealthSample[] }));

      const byDate = new Map<string, {
        bedtime: Date;
        wakeTime: Date;
        asleepMinutes: number;
        deepMinutes: number;
        remMinutes: number;
        platformId: string | null;
      }>();

      for (const s of sleepResult.samples ?? []) {
        if (s.sleepState === "awake" || s.sleepState === "inBed") continue;
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        const durationMin = (end.getTime() - start.getTime()) / 60000;
        // Bucket by the calendar date the sleep ended on — aligns with how
        // users think about "last night".
        const dateKey = end.toISOString().split("T")[0];
        const current = byDate.get(dateKey);
        if (current) {
          if (start < current.bedtime) current.bedtime = start;
          if (end > current.wakeTime) current.wakeTime = end;
          current.asleepMinutes += durationMin;
          if (s.sleepState === "deep") current.deepMinutes += durationMin;
          if (s.sleepState === "rem") current.remMinutes += durationMin;
        } else {
          byDate.set(dateKey, {
            bedtime: start,
            wakeTime: end,
            asleepMinutes: durationMin,
            deepMinutes: s.sleepState === "deep" ? durationMin : 0,
            remMinutes: s.sleepState === "rem" ? durationMin : 0,
            platformId: s.platformId ?? null,
          });
        }
      }

      const sleepRows = Array.from(byDate.entries())
        .filter(([, v]) => v.platformId)
        .map(([dateKey, v]) => ({
          user_id: user.id,
          sleep_date: dateKey,
          bedtime: v.bedtime.toISOString(),
          wake_time: v.wakeTime.toISOString(),
          duration_minutes: Math.round(v.asleepMinutes),
          deep_sleep_minutes: Math.round(v.deepMinutes),
          rem_sleep_minutes: Math.round(v.remMinutes),
          source_platform: platform,
          source_platform_id: v.platformId!,
        }));

      if (sleepRows.length) {
        await supabase.from("sleep_logs").upsert(sleepRows, {
          onConflict: "user_id,source_platform,source_platform_id",
          ignoreDuplicates: false,
        });
      }

      // Workouts
      const workoutResult = await Health.queryWorkouts({
        startDate: startISO,
        endDate: endISO,
        limit: 100,
        ascending: false,
      }).catch(() => ({ workouts: [] as NonNullable<Awaited<ReturnType<typeof Health.queryWorkouts>>["workouts"]> }));

      const workoutRows = (workoutResult.workouts ?? [])
        .filter((w) => w.platformId)
        .map((w) => ({
          user_id: user.id,
          activity_type: w.workoutType,
          started_at: w.startDate,
          ended_at: w.endDate,
          duration_seconds: Math.round(w.duration),
          distance_km: w.totalDistance != null ? w.totalDistance / 1000 : null,
          calories_burned: w.totalEnergyBurned != null ? Math.round(w.totalEnergyBurned) : null,
          status: "completed",
          source_platform: platform,
          source_platform_id: w.platformId!,
        }));

      if (workoutRows.length) {
        await supabase
          .from("activity_logs")
          .upsert(workoutRows, {
            onConflict: "user_id,source_platform,source_platform_id",
            ignoreDuplicates: false,
          });
      }

      setLastSyncAt(new Date());
    } catch (err) {
      console.error("useHealthSync: syncRecent failed", err);
    } finally {
      setSyncing(false);
    }
  }, [user, available, authorized, syncing]);

  return {
    available,
    authorized,
    syncing,
    lastSyncAt,
    requestAuthorization,
    syncRecent,
  };
}
