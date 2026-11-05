import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  deleteImportedGarminData,
  GarminRetryLater,
  revokeGarminRegistration,
} from "../_shared/garmin-connection.ts";
import { purgeGarminAiData } from "../_shared/garmin-ai-purge.ts";
import { adminClient, corsHeaders, json, requireUser } from "../_shared/garmin-http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const user = await requireUser(req);
    if (!user) return json({ error: "unauthorized" }, 401);

    // Each is the user's choice, and keeping is the default: they may be moving to another wearable.
    const body = await req.json().catch(() => ({})) as {
      delete_imported?: boolean;
      delete_ai_data?: boolean;
      delete_plans?: boolean;
    };
    const admin = adminClient();

    const outcome = await revokeGarminRegistration(admin, user.id);
    if (body.delete_imported === true) await deleteImportedGarminData(admin, user.id);
    if (body.delete_ai_data === true) {
      await purgeGarminAiData(admin, user.id, { deletePlans: body.delete_plans === true });
    }

    return json({
      status: "disconnected",
      remove_in_garmin_connect: outcome === "token_dead",
    });
  } catch (e) {
    if (e instanceof GarminRetryLater) return json({ error: "retry_later" }, 503);
    console.error("[garmin-disconnect]", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
