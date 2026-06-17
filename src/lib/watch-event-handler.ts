import { supabase } from "@/integrations/supabase/client";
import { onWatchWorkoutEvent } from "@/plugins/WatchPlugin";
import { Capacitor } from "@capacitor/core";

let initialised = false;

export function initWatchEventHandler() {
  if (initialised || !Capacitor.isNativePlatform()) return;
  initialised = true;

  onWatchWorkoutEvent(async (event) => {
    if (event.event !== "workoutCompleted") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

    await fetch(`${SUPABASE_URL}/functions/v1/log-watch-workout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        workoutId: event.workoutId ?? `watch-${Date.now()}`,
        workoutName: event.workoutName ?? "Watch Workout",
        durationSeconds: event.durationSeconds ?? 0,
        calories: event.calories ?? 0,
        averageHeartRate: event.averageHeartRate ?? 0,
        endedAt: new Date().toISOString(),
      }),
    }).catch(() => {
      // Network failure — the deduplication index means a retry on next open is safe
    });
  });
}
