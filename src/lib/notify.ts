import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";

export async function notifyUser(
  userId: string,
  category: "workout" | "nutrition" | "coaching" | "community" | "social" | "admin",
  title: string,
  body: string,
  url?: string
) {
  try {
    await supabase.functions.invoke("notify-user", {
      body: { user_id: userId, category, title, body, url },
    });
  } catch {
    // Notifications are best-effort — never block the main flow
  }
}

type PBSummary = {
  kind: 'duration' | 'calories' | 'streak';
  label: string;
  value: number;
};

// Schedules an on-device local notification to fire 30 min after a PB workout.
// Returns the notification ID so it can be cancelled if the user shares first.
export const schedulePBShareReminder = async (
  workoutId: string,
  workoutTitle: string,
  pbs: PBSummary[]
): Promise<number | null> => {
  if (pbs.length === 0 || !Capacitor.isNativePlatform()) return null;

  const lastChunk = workoutId.replace(/-/g, '').slice(-8);
  const notificationId = parseInt(lastChunk, 16) % 2147483647;

  const fireAt = new Date(Date.now() + 30 * 60 * 1000);
  const pbLabels = pbs.map(pb => pb.label).join(' + ');

  try {
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: `🏆 New PB — ${pbLabels}!`,
        body: `Your ${workoutTitle} was a personal best. Share it with the community?`,
        schedule: { at: fireAt, allowWhileIdle: true },
        extra: { deepLink: `/workout-library`, workoutId },
      }]
    });
    return notificationId;
  } catch (err) {
    console.error('[schedulePBShareReminder] failed:', err);
    return null;
  }
};

export const cancelPBShareReminder = async (notificationId: number) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  } catch (err) {
    console.error('[cancelPBShareReminder] failed:', err);
  }
};
