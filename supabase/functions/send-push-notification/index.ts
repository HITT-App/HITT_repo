import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  topic?: string;
  targetType?: "all" | "topic" | "user";
  targetValue?: string;
}

// Web Push implementation using VAPID
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    // For web push, we need to use the Web Push protocol
    // This is a simplified implementation - in production you'd use a library
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "TTL": "86400",
      },
      body: payload,
    });
    
    return response.ok;
  } catch (error) {
    console.error("Failed to send push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: PushPayload = await req.json();
    const { title, body, icon, url, topic, targetType = "all", targetValue } = payload;

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "Title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build subscription query based on target
    let subscriptionQuery = supabase.from("push_subscriptions").select("*");

    if (targetType === "user" && targetValue) {
      subscriptionQuery = subscriptionQuery.eq("user_id", targetValue);
    } else if (targetType === "topic" && targetValue) {
      subscriptionQuery = subscriptionQuery.contains("topics", [targetValue]);
    }

    const { data: subscriptions, error: subError } = await subscriptionQuery;

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: icon || "/pwa-192x192.png",
      url: url || "/",
      topic,
    });

    let successCount = 0;
    let failureCount = 0;

    // Send push to each subscription
    for (const sub of subscriptions || []) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject
      );

      if (success) {
        successCount++;
      } else {
        failureCount++;
        // Remove invalid subscriptions
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }

    // Record notification in history
    const { error: historyError } = await supabase.from("push_notifications").insert({
      title,
      body,
      icon: icon || "/pwa-192x192.png",
      url: url || "/",
      topic,
      sent_by: user.id,
      target_type: targetType,
      target_value: targetValue,
      success_count: successCount,
      failure_count: failureCount,
    });

    if (historyError) {
      console.error("Error recording notification:", historyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        total: subscriptions?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
