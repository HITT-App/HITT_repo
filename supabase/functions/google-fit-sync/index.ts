import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(
  connection: any,
  supabaseAdmin: any,
  clientId: string,
  clientSecret: string
) {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  // Refresh if expires in less than 5 minutes
  if (Date.now() < expiresAt - 5 * 60 * 1000) {
    return connection.access_token;
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }

  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("google_fit_connections")
    .update({
      access_token: data.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id);

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const clientId = Deno.env.get("GOOGLE_FIT_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_FIT_CLIENT_SECRET")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get connection
    const { data: connection } = await supabaseAdmin
      .from("google_fit_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!connection) {
      return new Response(
        JSON.stringify({ error: "Google Fit not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(connection, supabaseAdmin, clientId, clientSecret);

    // Fetch today's steps from Google Fit
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const fitRes = await fetch(
      "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aggregateBy: [
            {
              dataTypeName: "com.google.step_count.delta",
              dataSourceId:
                "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
            },
          ],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: now.getTime(),
        }),
      }
    );

    const fitData = await fitRes.json();
    if (!fitRes.ok) {
      console.error("Google Fit API error:", fitData);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from Google Fit", details: fitData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract step count
    let totalSteps = 0;
    if (fitData.bucket) {
      for (const bucket of fitData.bucket) {
        for (const dataset of bucket.dataset || []) {
          for (const point of dataset.point || []) {
            for (const val of point.value || []) {
              totalSteps += val.intVal || 0;
            }
          }
        }
      }
    }

    // Check if we already have a google_fit entry for today
    const todayStr = startOfDay.toISOString();
    const { data: existing } = await supabaseAdmin
      .from("health_metrics")
      .select("id")
      .eq("user_id", userId)
      .eq("metric_type", "steps")
      .eq("notes", "google_fit_sync")
      .gte("recorded_at", todayStr)
      .maybeSingle();

    if (existing) {
      // Update existing sync entry
      await supabaseAdmin
        .from("health_metrics")
        .update({ value: totalSteps, recorded_at: now.toISOString() })
        .eq("id", existing.id);
    } else if (totalSteps > 0) {
      // Insert new sync entry
      await supabaseAdmin.from("health_metrics").insert({
        user_id: userId,
        metric_type: "steps",
        value: totalSteps,
        unit: "steps",
        notes: "google_fit_sync",
        recorded_at: now.toISOString(),
      });
    }

    // Update last_synced_at
    await supabaseAdmin
      .from("google_fit_connections")
      .update({ last_synced_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, steps: totalSteps }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("google-fit-sync error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
