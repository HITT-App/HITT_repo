import { supabase } from "@/integrations/supabase/client";
import { onWatchWorkoutEvent } from "@/plugins/WatchPlugin";
import { Capacitor } from "@capacitor/core";
import { generateActivityShareCardBlob } from "@/lib/generate-activity-share-card";
import type { TriathlonLegResult } from "@/plugins/WatchPlugin";

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
          // Watch workouts come through as structured HIIT — route to the
          // hiit template so the card gets the intervals curve and the
          // right metric set (Duration / Calories / Avg HR).
          activityType: "hiit",
          avgHR: event.averageHeartRate,
          startedAt: new Date().toISOString(),
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

function formatLegClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

async function handleTriathlonShare(raceName: string, legs: TriathlonLegResult[]) {
  if (!legs.length) return;

  const legOf = (t: 'swim' | 'bike' | 'run') => legs.find(l => l.type === t);
  const totalSec = legs.reduce((s, l) => s + (l.elapsedSeconds ?? 0), 0);

  const blob = await generateActivityShareCardBlob({
    data: {
      activityType: 'triathlon',
      durationSeconds: totalSec,
      triathlonSplits: {
        swim: legOf('swim') ? formatLegClock(legOf('swim')!.elapsedSeconds) : undefined,
        bike: legOf('bike') ? formatLegClock(legOf('bike')!.elapsedSeconds) : undefined,
        run:  legOf('run')  ? formatLegClock(legOf('run')!.elapsedSeconds)  : undefined,
      },
    },
    format: 'story',
  });

  const file = new File(
    [blob],
    `${raceName.replace(/\s+/g, '-').toLowerCase()}-triathlon.png`,
    { type: 'image/png' },
  );
  const timeLabel = formatLegClock(totalSec);

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

  // Fallback: save the PNG locally so the user still has it.
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
