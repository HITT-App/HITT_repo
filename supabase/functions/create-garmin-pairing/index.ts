// Phone-side: creates a fresh 6-digit pairing code for the authenticated user.
//
// The phone shows this code + a 5-minute countdown; the user types it into
// the HITT CIQ app on their watch, which redeems it via
// redeem-garmin-pairing.
//
// If the user already has a live (unexpired, unredeemed, unrevoked)
// pairing, we invalidate it before creating a new one — the DB's partial
// unique index enforces "one live pairing per user", but a race between
// two rapid taps could still trip it, so we revoke defensively.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashPairingCode } from "../_shared/garmin-jwt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_SECONDS = 5 * 60;

function generateSixDigitCode(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  const num = new DataView(buf.buffer).getUint32(0);
  return (num % 1_000_000).toString().padStart(6, "0");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Revoke any prior live pairing so the partial unique index doesn't
    // trip when we insert. Idempotent — no-op if none exist.
    await admin
      .from("garmin_pairings")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("redeemed_at", null)
      .is("revoked_at", null);

    const code = generateSixDigitCode();
    const codeHash = await hashPairingCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    const { data, error } = await admin
      .from("garmin_pairings")
      .insert({
        user_id: user.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (error) {
      console.error("[create-garmin-pairing] insert error:", error.message);
      return new Response(JSON.stringify({ error: "Failed to create pairing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      code,
      pairing_id: data.id,
      expires_at: data.expires_at,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-garmin-pairing] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
