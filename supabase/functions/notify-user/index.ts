import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Category → notification_preferences column mapping
const CATEGORY_COLUMN: Record<string, string> = {
  workout:   "workout_reminders",
  nutrition: "nutrition_tips",
  coaching:  "coaching_updates",
  community: "community_notifications",
  social:    "social_notifications",
  admin:     "admin_notifications",
  // Jarvis-scheduled nudges (PB share prompt, missed workout, weekly recap).
  jarvis:    "jarvis_nudges",
};

// ── APNs JWT ──────────────────────────────────────────────────────────────────

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function makeApnsJwt(keyPem: string, keyId: string, teamId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(keyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: keyId })));
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })));
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, data);
  return `${header}.${payload}.${base64url(sig)}`;
}

// ── APNs delivery ─────────────────────────────────────────────────────────────

async function sendApns(
  token: string,
  title: string,
  body: string,
  url: string | undefined,
  bundleId: string,
  jwt: string
): Promise<boolean> {
  const apnsUrl = `https://api.push.apple.com/3/device/${token}`;
  const notification = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    url: url || "/",
  };
  try {
    const res = await fetch(apnsUrl, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(notification),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("APNs error:", res.status, err);
    }
    return res.ok;
  } catch (e) {
    console.error("APNs fetch failed:", e);
    return false;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, category, title, body, url } = await req.json() as {
      user_id: string;
      category: string;
      title: string;
      body: string;
      url?: string;
    };

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "user_id, title, body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: accept EITHER service-role bearer (server-to-server calls
    // from push-garmin-watch-workout / sync-healthkit-background) OR a
    // user session whose user.id matches the requested target user_id
    // (prevents user A firing pushes at user B's device).
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isService = authHeader === `Bearer ${serviceKey}`;

    if (!isService) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (user.id !== user_id) {
        return new Response(JSON.stringify({ error: "Cannot send push to another user" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check notification preferences
    const prefCol = CATEGORY_COLUMN[category] ?? "push_enabled";
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select(`push_enabled, ${prefCol}`)
      .eq("user_id", user_id)
      .single();

    if (prefs && (!prefs.push_enabled || prefs[prefCol] === false)) {
      return new Response(JSON.stringify({ skipped: "user preference" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get APNs credentials
    const apnsKey    = Deno.env.get("APNS_KEY");
    const apnsKeyId  = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID") ?? "9VH3JDWRMF";
    const bundleId   = Deno.env.get("APNS_BUNDLE_ID") ?? "com.hiitfitness.app";

    if (!apnsKey || !apnsKeyId) {
      return new Response(JSON.stringify({ error: "APNs not configured — set APNS_KEY and APNS_KEY_ID secrets" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await makeApnsJwt(apnsKey, apnsKeyId, apnsTeamId);

    // Get device tokens for this user
    const { data: tokens } = await supabase
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", user_id)
      .eq("platform", "ios");

    if (!tokens?.length) {
      return new Response(JSON.stringify({ skipped: "no device tokens" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const { token } of tokens) {
      const ok = await sendApns(token, title, body, url, bundleId, jwt);
      if (ok) sent++;
      else {
        // Remove stale token
        await supabase.from("device_push_tokens").delete().eq("token", token);
      }
    }

    return new Response(JSON.stringify({ sent, total: tokens.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("notify-user error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
