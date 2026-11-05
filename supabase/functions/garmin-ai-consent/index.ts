// Grants or withdraws Jarvis's use of Garmin data. Withdrawing removes what AI produced
// while consent was on. Chats and memory can't be split into Garmin and non-Garmin parts,
// so everything since consent goes, and the app warns about that first.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";

async function grant(admin: SupabaseClient, userId: string, connection: { ai_purge_from: string | null }) {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { ai_consent_at: now, ai_consent_withdrawn_at: null };
  if (!connection.ai_purge_from) {
    const { data: memory, error } = await admin.from("user_memories").select("memory").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    update.ai_purge_from = now;
    update.ai_memory_snapshot = memory?.memory ?? {};
  }
  const { error } = await admin.from("garmin_connections").update(update).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function purge(admin: SupabaseClient, userId: string, since: string, snapshot: unknown) {
  const { data: conversations, error: listError } = await admin.from("conversations").select("id").eq("user_id", userId);
  if (listError) throw new Error(listError.message);
  const ids = (conversations ?? []).map(c => c.id);

  const steps = [
    ...(ids.length ? [admin.from("messages").delete().in("conversation_id", ids).gte("created_at", since)] : []),
    admin.from("conversations").delete().eq("user_id", userId).gte("created_at", since),
    // One row per user, overwritten in place, so created_at can't date it. It regenerates daily.
    admin.from("daily_insights").delete().eq("user_id", userId),
    admin.from("activity_recommendations").delete().eq("user_id", userId).gte("created_at", since),
    admin.from("ai_generation_log").delete().eq("user_id", userId).gte("created_at", since),
    admin.from("user_memories").upsert({ user_id: userId, memory: snapshot ?? {}, updated_at: new Date().toISOString() }),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) throw new Error(error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as { action?: string };
    const admin = adminClient();
    const { data: connection, error } = await admin
      .from("garmin_connections")
      .select("status, ai_purge_from, ai_memory_snapshot")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!connection) return json({ error: "not_connected" }, 400);

    if (body.action === "grant") {
      if (connection.status === "disconnected") return json({ error: "not_connected" }, 400);
      await grant(admin, user.id, connection);
      return json({ status: "granted" });
    }

    if (body.action === "withdraw") {
      // Stop first, so nothing new reaches AI if the purge fails. A retry finishes the purge.
      const { error: stopError } = await admin
        .from("garmin_connections")
        .update({ ai_consent_at: null, ai_consent_withdrawn_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (stopError) throw new Error(stopError.message);

      if (connection.ai_purge_from) {
        await purge(admin, user.id, connection.ai_purge_from, connection.ai_memory_snapshot);
        const { error: clearError } = await admin
          .from("garmin_connections")
          .update({ ai_purge_from: null, ai_memory_snapshot: null })
          .eq("user_id", user.id);
        if (clearError) throw new Error(clearError.message);
      }
      return json({ status: "withdrawn" });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[garmin-ai-consent]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
