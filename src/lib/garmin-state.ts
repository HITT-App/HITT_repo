// Pure rules for how Garmin appears in the app. No Supabase or React, so they can be unit tested.

export type GarminConnectionRow = {
  status: string;
  permissions: string[];
  disconnect_reason: string | null;
  disconnected_at: string | null;
  ai_purge_from: string | null;
  ai_consent_at: string | null;
  workout_import_consented_at: string | null;
  course_import_consented_at: string | null;
  last_activity_at: string | null;
  last_workout_pushed_at: string | null;
};

export type GarminCardState = "not_connected" | "removed_in_garmin" | "connected" | "permission_off" | "needs_reconnect";

export function garminCardState(connection: GarminConnectionRow | null | undefined): GarminCardState {
  if (!connection) return "not_connected";
  if (connection.status === "disconnected") {
    return connection.disconnect_reason === "garmin_connect" ? "removed_in_garmin" : "not_connected";
  }
  if (connection.status === "needs_reconnect") return "needs_reconnect";
  if (connection.status === "permission_off" || connection.permissions.length === 0) return "permission_off";
  return "connected";
}

// Things the user turned off on Garmin's consent screen, even though the connection works.
export function missingSharing(permissions: string[]): string[] {
  const missing: string[] = [];
  if (!permissions.includes("ACTIVITY_EXPORT")) missing.push("Workouts won't come through to HIIT.");
  if (!permissions.includes("HEALTH_EXPORT")) missing.push("Health data won't come through to HIIT.");
  if (!permissions.includes("WORKOUT_IMPORT")) missing.push("HIIT can't send workouts to your watch.");
  if (!permissions.includes("COURSE_IMPORT")) missing.push("HIIT can't send routes to your watch.");
  return missing;
}

// Garmin requires its name with the device model, and some device names already start with it.
export function garminAttribution(deviceName: string | null | undefined): string {
  const model = (deviceName ?? "").trim().replace(/^garmin\s*/i, "");
  return model ? `Garmin ${model}` : "Garmin";
}

export const GARMIN_DERIVED_NOTE = "Insights derived in part from Garmin device-sourced data";

// Garmin's rules: its name under a figure that comes from Garmin, or the derived note when the
// figure mixes Garmin data with other sources. Null when no Garmin data went into it.
export function garminSourceLabel(rows: { source_platform?: string | null }[]): string | null {
  const fromGarmin = rows.filter(r => r.source_platform === "garmin_api").length;
  if (fromGarmin === 0) return null;
  return fromGarmin === rows.length ? "Garmin" : GARMIN_DERIVED_NOTE;
}

export type GarminReturn =
  | { status: "pending"; result: string }
  | { status: "declined" | "failed" };

export function parseGarminReturn(url: string): GarminReturn | null {
  if (!url.startsWith("hiitfitness://garmin-connected")) return null;
  const query = url.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const status = params.get("status");
  const result = params.get("result");
  if (status === "pending" && result) return { status: "pending", result };
  if (status === "declined") return { status: "declined" };
  return { status: "failed" };
}

export type WorkoutSyncStatus = "pending" | "sent" | "too_long" | "unsupported" | "needs_distance" | "failed";

export function workoutSyncLabel(status: string | null | undefined): string | null {
  switch (status as WorkoutSyncStatus) {
    case "pending": return "Sending to Garmin";
    case "sent": return "On your watch after next sync";
    case "too_long": return "Too long to send to Garmin";
    case "unsupported": return "Can't be sent to Garmin";
    case "needs_distance": return "Add a distance to send to Garmin";
    case "failed": return "Couldn't send to Garmin";
    default: return null;
  }
}

export type RouteSendStatus = "sent" | "already_sent" | "in_progress" | "too_few_points" | "too_long" | "rejected";

export function routeSendMessage(status: string): string {
  switch (status as RouteSendStatus) {
    case "sent":
    case "already_sent": return "Waiting for your next watch sync";
    case "in_progress": return "Already sending this route";
    case "too_few_points": return "This route needs at least two points on the map";
    case "too_long": return "This route is too long for Garmin";
    default: return "Garmin didn't accept this route";
  }
}

// What each Garmin function error means to the user, and what they can do about it.
export function garminErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "needs_reconnect": return "Your Garmin connection has stopped. Reconnect it in Connected Devices.";
    case "permission_off": return "Sharing is off in Garmin Connect. Turn it on there, then try again.";
    case "not_connected": return "Connect Garmin first, in Connected Devices.";
    case "too_many": return "That's the limit for today. Try again tomorrow.";
    case "try_later":
    case "retry_later": return "Garmin isn't responding. Try again in a few minutes.";
    case "network": return "You look offline. Check your connection and try again.";
    default: return "Something went wrong. Try again in a moment.";
  }
}
