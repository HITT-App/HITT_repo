// Grants or withdraws Jarvis's use of Garmin data. Withdrawing removes what AI produced while
// consent was on, because chat history and memory are resent to the AI on every turn. Keeping
// them would keep sending Garmin-derived data after consent ended. Plans are the user's choice.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { purgeGarminAiData } from "../_shared/garmin-ai-purge.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({})) as { action?: string; delete_plans?: boolean };
    const admin = adminClient();
    const { data: connection, error } = await admin
      .from("garmin_connections")
      .select("status, ai_consent_at, ai_purge_from")
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

      await purgeGarminAiData(admin, user.id, { deletePlans: body.delete_plans === true });
      return json({ status: "withdrawn" });
    }

    // For someone who disconnected and kept this data, then later changes their mind.
    if (body.action === "delete_kept_data") {
      if (connection.status !== "disconnected") return json({ error: "still_connected" }, 400);
      await purgeGarminAiData(admin, user.id, { deletePlans: body.delete_plans === true });
      return json({ status: "deleted" });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[garmin-ai-consent]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
