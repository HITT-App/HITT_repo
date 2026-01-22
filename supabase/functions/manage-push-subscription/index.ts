import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionPayload {
  action: "subscribe" | "unsubscribe" | "update-topics";
  subscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  topics?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: SubscriptionPayload = await req.json();
    const { action, subscription, topics } = payload;

    if (action === "subscribe") {
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: "Invalid subscription data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert subscription
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          topics: topics || ["workout", "nutrition", "coaching", "community"],
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure notification preferences exist
      await supabase.from("notification_preferences").upsert(
        { user_id: user.id, push_enabled: true },
        { onConflict: "user_id" }
      );

      return new Response(JSON.stringify({ success: true, message: "Subscribed successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unsubscribe") {
      if (subscription?.endpoint) {
        // Remove specific subscription
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);

        if (error) {
          console.error("Error removing subscription:", error);
          return new Response(JSON.stringify({ error: "Failed to remove subscription" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Remove all subscriptions for user
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          console.error("Error removing subscriptions:", error);
          return new Response(JSON.stringify({ error: "Failed to remove subscriptions" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update preferences
      await supabase
        .from("notification_preferences")
        .update({ push_enabled: false })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, message: "Unsubscribed successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-topics") {
      if (!topics || !Array.isArray(topics)) {
        return new Response(JSON.stringify({ error: "Topics array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .update({ topics })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating topics:", error);
        return new Response(JSON.stringify({ error: "Failed to update topics" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "Topics updated" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
