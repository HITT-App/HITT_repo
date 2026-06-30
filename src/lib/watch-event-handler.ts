import { supabase } from "@/integrations/supabase/client";
import { onWatchWorkoutEvent } from "@/plugins/WatchPlugin";
import { Capacitor } from "@capacitor/core";
import { generateTriathlonCard, type TriathlonShareLeg } from "@/components/workout/ShareCardCanvas";

let initialised = false;

export function initWatchEventHandler() {
  if (initialised || !Capacitor.isNativePlatform()) return;
  initialised = true;

  onWatchWorkoutEvent(async (event) => {
    if (event.event === "triathlonShareRequested") {
      await handleTriathlonShare(event.raceName ?? "Triathlon", event.legs ?? []);
      return;
    }

    // User tapped "Share to phone" on the Watch completion screen.
    // Dispatch the same custom event the iPhone WorkoutPlayer uses so the
    // VoiceController overlay opens JarvisMode's share card with these stats.
    if (event.event === "shareRequested") {
      const durationMin = Math.max(1, Math.round((event.durationSeconds ?? 0) / 60));
      window.dispatchEvent(new CustomEvent("hitt:open-jarvis-share", {
        detail: {
          workoutId: event.workoutId ?? `watch-${Date.now()}`,
          workoutTitle: event.workoutName ?? "Watch Workout",
          durationMin,
          calories: event.calories ?? 0,
        },
      }));
      return;
    }

    if (event.event !== "workoutCompleted") return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/log-watch-workout`, {
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
    }).catch(() => null);
    if (!res || !res.ok) {
      // Network failure or 5xx — the deduplication index means a retry
      // on the next workout completion (or app open) is safe.
      return;
    }
  });
}

async function handleTriathlonShare(raceName: string, legs: TriathlonShareLeg[]) {
  if (!legs.length) return;
  const dataUrl = await generateTriathlonCard(raceName, legs);
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], `${raceName.replace(/\s+/g, "-").toLowerCase()}-triathlon.png`, { type: "image/png" });

  const totalSec = legs.reduce((s, l) => s + (l.elapsedSeconds ?? 0), 0);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeLabel = totalSec >= 3600
    ? `${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60)}m`
    : `${mins}m ${String(secs).padStart(2, "0")}s`;

  const shareData: ShareData = {
    title: `${raceName} — ${timeLabel}`,
    text: `Just finished ${raceName} in ${timeLabel} 🏆`,
    files: [file],
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      return;
    }
  } catch {
    // User cancelled or share failed — fall through to download
  }

  // Fallback: download the PNG so the user has it locally
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
