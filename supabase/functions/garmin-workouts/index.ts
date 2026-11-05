// The user's controls for sending workouts to Garmin. Consent is separate from connecting:
// Garmin may keep and reuse what it receives, so the app shows that notice first.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";
import { mapOneOff, type OneOffPayload } from "../_shared/garmin-workout.ts";

const MAX_ONE_OFFS_PER_DAY = 10;
const MAX_LEG_KM = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as {
      action?: string;
      scheduled_workout_id?: string;
      distance_m?: number;
      date?: string;
      sport?: string;
      name?: string;
      swim_km?: number;
      bike_km?: number;
      run_km?: number;
    };
    const admin = adminClient();
    const { data: connection, error } = await admin
      .from("garmin_connections")
      .select("status, permissions, workout_import_consented_at")
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

    if (body.action === "set_distance" && body.scheduled_workout_id) {
      const distance = Math.round(Number(body.distance_m));
      if (!(distance > 0 && distance <= MAX_LEG_KM * 1000)) return json({ error: "invalid_distance" }, 400);
      const { error: distanceError } = await admin
        .from("garmin_workout_links")
        .update({ swim_distance_m: distance, content_hash: null, sync_status: "pending", last_error: null })
        .eq("user_id", user.id)
        .eq("scheduled_workout_id", body.scheduled_workout_id);
      if (distanceError) throw new Error(distanceError.message);
      await markDirty();
      return json({ status: "queued" });
    }

    if (body.action === "send_sport" || body.action === "send_triathlon") {
      if (!connection.workout_import_consented_at) return json({ error: "consent_required" }, 403);
      if (connection.status !== "active" || !connection.permissions.includes("WORKOUT_IMPORT")) {
        return json({ error: "permission_off" }, 403);
      }
      // The user's local date, because "today" on the watch is theirs, not the server's.
      if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return json({ error: "invalid_date" }, 400);

      const payload: OneOffPayload = body.action === "send_sport"
        ? { kind: "sport", sport: String(body.sport ?? "").slice(0, 40), distance_m: body.distance_m ?? null }
        : {
          kind: "triathlon",
          name: body.name ? String(body.name).slice(0, 40) : null,
          swim_km: Number(body.swim_km),
          bike_km: Number(body.bike_km),
          run_km: Number(body.run_km),
        };
      if (payload.kind === "triathlon" && [payload.swim_km, payload.bike_km, payload.run_km].some(km => km > MAX_LEG_KM)) {
        return json({ error: "invalid_distance" }, 400);
      }

      // No row is saved for these, so the app can show its "start it on your watch" card or ask for a distance.
      const mapped = mapOneOff(payload);
      if (!mapped.ok) return json({ status: mapped.reason === "unsupported" ? "start_on_watch" : mapped.reason });

      const { count, error: countError } = await admin
        .from("garmin_one_off_workouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("workout_date", body.date);
      if (countError) throw new Error(countError.message);
      if ((count ?? 0) >= MAX_ONE_OFFS_PER_DAY) return json({ error: "too_many" }, 429);

      const { data: created, error: insertError } = await admin
        .from("garmin_one_off_workouts")
        .insert({ user_id: user.id, workout_date: body.date, payload })
        .select("id")
        .single();
      if (insertError) throw new Error(insertError.message);
      await markDirty();
      return json({ status: "queued", id: created.id });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[garmin-workouts]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
