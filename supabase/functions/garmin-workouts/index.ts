// The user's controls for sending workouts to Garmin. Consent is separate from connecting:
// Garmin may keep and reuse what it receives, so the app shows that notice first.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as { action?: string; scheduled_workout_id?: string };
    const admin = adminClient();
    const { data: connection, error } = await admin
      .from("garmin_connections")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection || connection.status === "disconnected") return json({ error: "not_connected" }, 400);

    const markDirty = () => admin.from("garmin_sync_dirty").upsert({ user_id: user.id, marked_at: new Date().toISOString() });

    if (body.action === "consent" || body.action === "stop") {
      const { error: updateError } = await admin
        .from("garmin_connections")
        .update({ workout_import_consented_at: body.action === "consent" ? new Date().toISOString() : null })
        .eq("user_id", user.id);
      if (updateError) throw new Error(updateError.message);
      if (body.action === "consent") await markDirty();
      return json({ status: body.action === "consent" ? "on" : "off" });
    }

    if (body.action === "retry" && body.scheduled_workout_id) {
      // Clearing the hash makes the next sync send it again. Scoped to this user's own row.
      const { error: retryError } = await admin
        .from("garmin_workout_links")
        .update({ content_hash: null, sync_status: "pending", last_error: null })
        .eq("user_id", user.id)
        .eq("scheduled_workout_id", body.scheduled_workout_id);
      if (retryError) throw new Error(retryError.message);
      await markDirty();
      return json({ status: "queued" });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[garmin-workouts]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
