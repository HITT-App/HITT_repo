// Run each minute by pg_cron. Every handler is safe to run twice for the same push.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { upsertActivities } from "../_shared/activity-upsert.ts";
import { adminClient } from "../_shared/garmin-http.ts";
import {
  type GarminActivitySummary,
  isStalePermissionChange,
  mapGarminActivity,
  type PermissionsChange,
  secretMatches,
  statusForPermissions,
} from "../_shared/garmin-inbox.ts";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const LEASE_SECONDS = 300;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const BACKLOG_ALERT = 500;

async function handleActivities(admin: SupabaseClient, summaries: GarminActivitySummary[]) {
  const garminIds = [...new Set(summaries.map(s => s.userId).filter(Boolean))] as string[];
  if (!garminIds.length) return;

  const { data: connections, error } = await admin
    .from("garmin_connections")
    .select("user_id, garmin_user_id, permissions, status")
    .in("garmin_user_id", garminIds)
    .neq("status", "disconnected");
  if (error) throw new Error(error.message);

  // Unknown users are dropped without an error, so Garmin doesn't retry for a week.
  const allowed = new Map(
    (connections ?? [])
      .filter(c => c.status !== "permission_off" && c.permissions.includes("ACTIVITY_EXPORT"))
      .map(c => [c.garmin_user_id, c.user_id]),
  );

  const rows = summaries.flatMap(s => {
    const userId = s.userId ? allowed.get(s.userId) : undefined;
    const row = userId ? mapGarminActivity(s, userId) : null;
    return row ? [row] : [];
  });
  if (!rows.length) return;

  await upsertActivities(admin, rows);
  await admin
    .from("garmin_connections")
    .update({ last_activity_at: new Date().toISOString() })
    .in("user_id", [...new Set(rows.map(r => r.user_id))]);
}

async function handleDeregistrations(admin: SupabaseClient, items: { userId?: string }[]) {
  for (const { userId } of items) {
    if (!userId) continue;
    const { data: disconnected, error } = await admin
      .from("garmin_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        disconnect_reason: "garmin_connect",
      })
      .eq("garmin_user_id", userId)
      .neq("status", "disconnected")
      .select("user_id");
    if (error) throw new Error(error.message);
    for (const row of disconnected ?? []) {
      await admin.from("garmin_tokens").delete().eq("user_id", row.user_id);
    }
  }
}

async function handlePermissions(admin: SupabaseClient, changes: PermissionsChange[]) {
  for (const change of changes) {
    if (!change.userId) continue;
    const { data: conn } = await admin
      .from("garmin_connections")
      .select("user_id, status, permissions_changed_at")
      .eq("garmin_user_id", change.userId)
      .neq("status", "disconnected")
      .maybeSingle();
    if (!conn || isStalePermissionChange(change.changeTimeInSeconds, conn.permissions_changed_at)) continue;

    const permissions = change.permissions ?? [];
    const { error } = await admin.from("garmin_connections").update({
      permissions,
      permissions_changed_at: change.changeTimeInSeconds ?? null,
      status: statusForPermissions(permissions, conn.status),
    }).eq("user_id", conn.user_id);
    if (error) throw new Error(error.message);
  }
}

async function processPush(admin: SupabaseClient, rawBody: string): Promise<string> {
  const push = JSON.parse(rawBody) as Record<string, unknown[]>;
  const types = Object.keys(push);
  if (Array.isArray(push.activities)) await handleActivities(admin, push.activities as GarminActivitySummary[]);
  if (Array.isArray(push.deregistrations)) await handleDeregistrations(admin, push.deregistrations as { userId?: string }[]);
  if (Array.isArray(push.userPermissionsChange)) await handlePermissions(admin, push.userPermissionsChange as PermissionsChange[]);
  return types.join(",");
}

serve(async (req) => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? null;
  if (!secretMatches(token, Deno.env.get("GARMIN_CRON_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = adminClient();
  const { data: batch, error } = await admin.rpc("claim_garmin_inbox", {
    batch_size: BATCH_SIZE,
    max_attempts: MAX_ATTEMPTS,
    lease_seconds: LEASE_SECONDS,
  });
  if (error) {
    console.error("[garmin-process-inbox] claim failed:", error.message);
    return new Response("Claim failed", { status: 500 });
  }

  let processed = 0;
  let failed = 0;
  for (const item of batch ?? []) {
    try {
      const summaryType = await processPush(admin, item.raw_body);
      await admin.from("garmin_webhook_inbox").update({
        processed_at: new Date().toISOString(),
        summary_type: summaryType,
        last_error: null,
      }).eq("id", item.id);
      processed++;
    } catch (e) {
      failed++;
      // The name only: messages from parsing can quote the raw body, which is personal data.
      const name = (e as Error).name;
      await admin.from("garmin_webhook_inbox").update({ last_error: name, claimed_at: null }).eq("id", item.id);
      console.error("[garmin-process-inbox] item failed:", item.id, name);
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  await admin.from("garmin_webhook_inbox").delete().lt("received_at", cutoff);

  const { count } = await admin
    .from("garmin_webhook_inbox")
    .select("id", { count: "exact", head: true })
    .is("processed_at", null);
  if ((count ?? 0) > BACKLOG_ALERT) console.error("[garmin-process-inbox] backlog:", count);

  return new Response(JSON.stringify({ processed, failed }), { headers: { "Content-Type": "application/json" } });
});
