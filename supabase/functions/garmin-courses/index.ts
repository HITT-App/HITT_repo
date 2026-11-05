// Sends a HIIT route to the user's Garmin as a course. Each send is one tap, so it runs
// straight away rather than waiting for the sync. Garmin then syncs it to the watch itself.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GarminRetryLater, GarminTokenDead, getValidAccessToken } from "../_shared/garmin-connection.ts";
import { sha256Hex } from "../_shared/garmin-crypto.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";
import { canSendRoute, mapCourse, planCourseSend } from "../_shared/garmin-course.ts";

const COURSE_URL = "https://apis.garmin.com/training-api/courses/v1/course";
const SEND_LOCK_MS = 60 * 1000;

function courseFetch(token: string, url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as {
      action?: string;
      route_id?: string;
      activity_type?: string;
    };
    const admin = adminClient();
    const { data: connection, error } = await admin
      .from("garmin_connections")
      .select("status, permissions, garmin_user_id, course_import_consented_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection || connection.status === "disconnected") return json({ error: "not_connected" }, 400);

    const setStatus = (status: string) =>
      admin.from("garmin_connections").update({ status }).eq("user_id", user.id);

    // What Garmin already holds stays there when this is turned off. The user removes it per route.
    if (body.action === "consent" || body.action === "stop") {
      const { error: updateError } = await admin
        .from("garmin_connections")
        .update({ course_import_consented_at: body.action === "consent" ? new Date().toISOString() : null })
        .eq("user_id", user.id);
      if (updateError) throw new Error(updateError.message);
      return json({ status: body.action === "consent" ? "on" : "off" });
    }

    if (body.action !== "send" && body.action !== "remove") return json({ error: "unknown_action" }, 400);
    if (!body.route_id || !/^[0-9a-f-]{36}$/i.test(body.route_id)) return json({ error: "invalid_route" }, 400);

    if (connection.status === "needs_reconnect") return json({ error: "needs_reconnect" }, 409);
    if (connection.status !== "active" || !connection.permissions.includes("COURSE_IMPORT")) {
      return json({ error: "permission_off" }, 403);
    }

    const handleRefusal = async (res: Response): Promise<Response | null> => {
      if (res.status === 429) return json({ error: "try_later" }, 429);
      if (res.status === 412) {
        await setStatus("permission_off");
        return json({ error: "permission_off" }, 403);
      }
      if (res.status === 401) {
        await setStatus("needs_reconnect");
        return json({ error: "needs_reconnect" }, 409);
      }
      if (res.status >= 500) return json({ error: "try_later" }, 503);
      return null;
    };

    const links = () => admin.from("garmin_course_links");

    if (body.action === "remove") {
      const { data: link, error: linkError } = await links()
        .select("garmin_course_id, garmin_user_id")
        .eq("user_id", user.id)
        .eq("route_id", body.route_id)
        .maybeSingle();
      if (linkError) throw new Error(linkError.message);

      // A course in another Garmin account can't be reached from this one.
      if (link?.garmin_course_id && link.garmin_user_id === connection.garmin_user_id) {
        const token = await getValidAccessToken(admin, user.id);
        const res = await courseFetch(token, `${COURSE_URL}/${link.garmin_course_id}`, "DELETE");
        if (res.status !== 404) {
          const refusal = await handleRefusal(res);
          if (refusal) return refusal;
          if (!res.ok) throw new Error(`Garmin refused the delete: ${res.status}`);
        }
      }
      const { error: deleteError } = await links().delete().eq("user_id", user.id).eq("route_id", body.route_id);
      if (deleteError) throw new Error(deleteError.message);
      return json({ status: "removed" });
    }

    if (!connection.course_import_consented_at) return json({ error: "consent_required" }, 403);

    const { data: route, error: routeError } = await admin
      .from("routes")
      .select("user_id, name, coordinates, surface_type, elevation_gain_m, is_public, is_official")
      .eq("id", body.route_id)
      .maybeSingle();
    if (routeError) throw new Error(routeError.message);
    if (!route || !canSendRoute(route, user.id)) return json({ error: "route_not_found" }, 404);

    const mapped = mapCourse(route, body.activity_type);
    if (!mapped.ok) return json({ status: mapped.reason });
    const hash = await sha256Hex(JSON.stringify(mapped.course));

    // A double tap must not create the course twice.
    const { error: seedError } = await links().upsert(
      { user_id: user.id, route_id: body.route_id },
      { onConflict: "user_id,route_id", ignoreDuplicates: true },
    );
    if (seedError) throw new Error(seedError.message);
    const now = new Date();
    const { data: locked, error: lockError } = await links()
      .update({ sending_until: new Date(now.getTime() + SEND_LOCK_MS).toISOString() })
      .eq("user_id", user.id)
      .eq("route_id", body.route_id)
      .or(`sending_until.is.null,sending_until.lt.${now.toISOString()}`)
      .select("garmin_course_id, garmin_user_id, content_hash");
    if (lockError) throw new Error(lockError.message);
    if (!locked?.length) return json({ status: "in_progress" });

    const release = (fields: Record<string, unknown> = {}) =>
      links().update({ sending_until: null, ...fields }).eq("user_id", user.id).eq("route_id", body.route_id);

    try {
      const link = locked[0];
      const plan = planCourseSend(link, connection.garmin_user_id, hash);
      if (plan === "skip") {
        await release();
        return json({ status: "already_sent", garmin_course_id: link.garmin_course_id });
      }

      const token = await getValidAccessToken(admin, user.id);
      if (plan === "update") {
        const res = await courseFetch(token, `${COURSE_URL}/${link.garmin_course_id}`, "PUT", {
          courseId: link.garmin_course_id,
          ...mapped.course,
        });
        if (res.ok) {
          const { error: saveError } = await release({ content_hash: hash, last_error: null, sent_at: new Date().toISOString() });
          if (saveError) throw new Error(saveError.message);
          return json({ status: "sent", garmin_course_id: link.garmin_course_id });
        }
        // The user may have deleted it in Garmin Connect. Anything else stops here.
        if (res.status !== 404) {
          const refusal = await handleRefusal(res);
          await release({ last_error: `Update refused: ${res.status}` });
          return refusal ?? json({ status: "rejected" });
        }
      }

      const res = await courseFetch(token, COURSE_URL, "POST", mapped.course);
      if (!res.ok) {
        const refusal = await handleRefusal(res);
        await release({ last_error: `Create refused: ${res.status}` });
        return refusal ?? json({ status: "rejected" });
      }
      const created = await res.json() as { courseId?: number };
      if (!created.courseId) throw new Error("Garmin returned no course ID");

      const { error: saveError } = await release({
        garmin_course_id: created.courseId,
        garmin_user_id: connection.garmin_user_id,
        content_hash: hash,
        last_error: null,
        sent_at: new Date().toISOString(),
      });
      if (saveError) throw new Error(saveError.message);
      return json({ status: "sent", garmin_course_id: created.courseId });
    } catch (e) {
      await release({ last_error: (e as Error).message.slice(0, 200) });
      throw e;
    }
  } catch (e) {
    if (e instanceof GarminTokenDead) return json({ error: "needs_reconnect" }, 409);
    if (e instanceof GarminRetryLater) return json({ error: "try_later" }, 503);
    console.error("[garmin-courses]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
