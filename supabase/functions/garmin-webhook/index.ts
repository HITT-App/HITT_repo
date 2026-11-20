// Receives every Garmin push. Garmin requires a 200 before any processing and
// retries hourly for 7 days otherwise, so this only authenticates and stores.
// Garmin doesn't sign requests, so the secret in the URL path is the check.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { secretMatches, webhookKey } from "../_shared/garmin-inbox.ts";
import { adminClient } from "../_shared/garmin-http.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const given = webhookKey(req.url);
  const allowed = secretMatches(given, Deno.env.get("GARMIN_WEBHOOK_SECRET")) ||
    secretMatches(given, Deno.env.get("GARMIN_WEBHOOK_SECRET_PREVIOUS"));
  if (!allowed) return new Response("Unauthorized", { status: 401 });

  const { error } = await adminClient().from("garmin_webhook_inbox").insert({ raw_body: await req.text() });
  if (error) {
    console.error("[garmin-webhook] inbox insert failed:", error.message);
    return new Response("Try again", { status: 500 });
  }
  return new Response("OK", { status: 200 });
});
