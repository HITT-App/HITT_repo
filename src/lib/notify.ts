import { supabase } from "@/integrations/supabase/client";

export async function notifyUser(
  userId: string,
  category: "workout" | "nutrition" | "coaching" | "community" | "social" | "admin" | "jarvis",
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

// Schedules a server-side PB-share reminder push to fire 30 minutes
// after a workout_progress row is written. The pg_cron
// fire_pb_share_reminders job (see migration 20260703170000) scans
// workout_progress for rows where pb_share_reminder_at is due and
// pb_share_notified_at is NULL, then fires notify-user.
//
// Server-side means the reminder fires even if the app is fully
// closed and even if the phone is restored to a new device — neither
// possible with the old LocalNotifications path this replaces.
//
// Takes the workout_progress row id (returned from the insert
// upstream). Returns that id back if scheduled so the caller can
// call cancelPBShareReminder if the user shares immediately.
export const schedulePBShareReminder = async (
  workoutProgressId: string,
  pbs: PBSummary[]
): Promise<string | null> => {
  if (pbs.length === 0) return null;
  const fireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  try {
    const { error } = await supabase
      .from("workout_progress")
      .update({ pb_share_reminder_at: fireAt })
      .eq("id", workoutProgressId);
    if (error) {
      console.error("[schedulePBShareReminder] update failed:", error.message);
      return null;
    }
    return workoutProgressId;
  } catch (err) {
    console.error("[schedulePBShareReminder] failed:", err);
    return null;
  }
};

// Cancels a pending PB-share reminder by clearing pb_share_reminder_at
// and stamping pb_share_notified_at so the cron's fanout guard trips.
export const cancelPBShareReminder = async (workoutProgressId: string) => {
  try {
    await supabase
      .from("workout_progress")
      .update({
        pb_share_reminder_at: null,
        pb_share_notified_at: new Date().toISOString(),
      })
      .eq("id", workoutProgressId);
  } catch (err) {
    console.error("[cancelPBShareReminder] failed:", err);
  }
};
