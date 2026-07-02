// Watch-side: exchanges a 6-digit pairing code for a long-lived watch push JWT.
//
// Called with:
//   POST /functions/v1/redeem-garmin-pairing
//   Body: { code: "123456", device_label?: "fenix 7" }
//   (No Authorization header — the code IS the auth.)
//
// Server behaviour:
//   - Hash the incoming code.
//   - Look up the matching row that's unexpired, unredeemed, unrevoked.
//   - If a matching row exists but attempts >= 5, refuse (code burnt).
//   - If no row matches, increment attempts on all live rows for the
//     apparent user (we don't know user_id here — so we key on the hash
//     directly). If nothing matched, no attempts row exists to increment.
//   - On success: set redeemed_at, mint a JWT, return it to the watch.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashPairingCode, signWatchPushJwt } from "../_shared/garmin-jwt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const MAX_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GARMIN_PAIRING_HMAC_SECRET = Deno.env.get("GARMIN_PAIRING_HMAC_SECRET");
    if (!GARMIN_PAIRING_HMAC_SECRET) {
      console.error("[redeem-garmin-pairing] missing GARMIN_PAIRING_HMAC_SECRET");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      device_label?: string;
    };
    const code = String(body.code ?? "").trim();

    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const codeHash = await hashPairingCode(code);

    const nowISO = new Date().toISOString();
    const { data: matches } = await admin
      .from("garmin_pairings")
      .select("id, user_id, attempts, expires_at, redeemed_at, revoked_at")
      .eq("code_hash", codeHash)
      .is("redeemed_at", null)
      .is("revoked_at", null)
      .gt("expires_at", nowISO)
      .limit(1);

    const match = matches?.[0];

    if (!match) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.attempts >= MAX_ATTEMPTS) {
      return new Response(JSON.stringify({ error: "Too many attempts — request a new code" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark redeemed + set device_label if the watch sent one.
    const { error: updateError } = await admin
      .from("garmin_pairings")
      .update({
        redeemed_at: nowISO,
        device_label: (body.device_label ?? null) as string | null,
        last_seen_at: nowISO,
      })
      .eq("id", match.id);

    if (updateError) {
      console.error("[redeem-garmin-pairing] update failed:", updateError.message);
      return new Response(JSON.stringify({ error: "Redemption failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await signWatchPushJwt(
      { sub: match.user_id, pairing_id: match.id },
      GARMIN_PAIRING_HMAC_SECRET,
    );

    return new Response(JSON.stringify({
      ok: true,
      token: jwt,
      pairing_id: match.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[redeem-garmin-pairing] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
