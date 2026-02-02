import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityEvent {
  eventType: string;
  severity: "info" | "warning" | "error" | "critical";
  userId?: string;
  ipAddressHash?: string;
  userAgentHash?: string;
  endpoint?: string;
  eventData?: Record<string, unknown>;
}

interface HealthCheckResult {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  details?: string;
}

// Hash function for GDPR-compliant logging (no raw PII)
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// Structured logging utility
function log(level: string, message: string, data: Record<string, unknown> = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "security-monitor",
    ...data,
  };
  console.log(JSON.stringify(logEntry));
}

serve(async (req) => {
  const correlationId = crypto.randomUUID();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("warn", "Unauthorized access attempt to security monitor", {
        correlationId,
        eventType: "unauthorized_access",
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      log("warn", "Non-admin attempted security monitor access", {
        correlationId,
        userId: user.id,
        eventType: "privilege_escalation_attempt",
      });
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    switch (action) {
      case "health": {
        // Application health check
        const healthChecks: HealthCheckResult[] = [];

        // Database health
        const dbStart = Date.now();
        const { error: dbError } = await supabase.from("profiles").select("id").limit(1);
        healthChecks.push({
          service: "database",
          status: dbError ? "unhealthy" : "healthy",
          latencyMs: Date.now() - dbStart,
          details: dbError?.message,
        });

        // Auth health
        const authStart = Date.now();
        const { error: authHealthError } = await supabase.auth.getSession();
        healthChecks.push({
          service: "auth",
          status: authHealthError ? "unhealthy" : "healthy",
          latencyMs: Date.now() - authStart,
          details: authHealthError?.message,
        });

        const overallStatus = healthChecks.every((h) => h.status === "healthy")
          ? "healthy"
          : healthChecks.some((h) => h.status === "unhealthy")
          ? "unhealthy"
          : "degraded";

        return new Response(
          JSON.stringify({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            correlationId,
            checks: healthChecks,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "log-event": {
        // Log a security event
        if (req.method !== "POST") {
          return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const event: SecurityEvent = await req.json();

        // Hash any IP addresses for GDPR compliance
        let ipHash = null;
        if (event.ipAddressHash) {
          ipHash = await hashValue(event.ipAddressHash);
        }

        let uaHash = null;
        if (event.userAgentHash) {
          uaHash = await hashValue(event.userAgentHash);
        }

        const { data, error } = await supabase.from("security_events").insert({
          event_type: event.eventType,
          severity: event.severity,
          user_id: event.userId,
          ip_address_hash: ipHash,
          user_agent_hash: uaHash,
          endpoint: event.endpoint,
          correlation_id: correlationId,
          event_data: event.eventData || {},
        }).select().single();

        if (error) {
          log("error", "Failed to log security event", {
            correlationId,
            error: error.message,
          });
          return new Response(
            JSON.stringify({ error: "Failed to log event" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log("info", "Security event logged", {
          correlationId,
          eventType: event.eventType,
          severity: event.severity,
        });

        return new Response(
          JSON.stringify({ success: true, eventId: data.id, correlationId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "dashboard": {
        // Security dashboard data
        const since = url.searchParams.get("since") || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get event counts by severity
        const { data: eventsBySeverity } = await supabase
          .from("security_events")
          .select("severity, id")
          .gte("created_at", since);

        const severityCounts = {
          info: 0,
          warning: 0,
          error: 0,
          critical: 0,
        };

        (eventsBySeverity || []).forEach((e) => {
          if (e.severity in severityCounts) {
            severityCounts[e.severity as keyof typeof severityCounts]++;
          }
        });

        // Get recent critical/error events
        const { data: recentAlerts } = await supabase
          .from("security_events")
          .select("*")
          .in("severity", ["error", "critical"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20);

        // Get auth failure patterns
        const { data: authFailures } = await supabase
          .from("security_events")
          .select("*")
          .eq("event_type", "auth_failure")
          .gte("created_at", since);

        // Get rate limit violations
        const { data: rateLimitEvents } = await supabase
          .from("rate_limit_events")
          .select("*")
          .not("blocked_at", "is", null)
          .gte("created_at", since);

        return new Response(
          JSON.stringify({
            period: { since },
            correlationId,
            summary: {
              totalEvents: eventsBySeverity?.length || 0,
              bySeverity: severityCounts,
              authFailures: authFailures?.length || 0,
              rateLimitBlocks: rateLimitEvents?.length || 0,
            },
            recentAlerts: recentAlerts || [],
            generatedAt: new Date().toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "gdpr-audit": {
        // GDPR audit trail - who accessed what
        const userId = url.searchParams.get("userId");
        const since = url.searchParams.get("since") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        let query = supabase
          .from("data_access_logs")
          .select("*")
          .gte("created_at", since)
          .order("created_at", { ascending: false });

        if (userId) {
          query = query.eq("accessor_id", userId);
        }

        const { data: accessLogs } = await query.limit(100);

        return new Response(
          JSON.stringify({
            period: { since },
            correlationId,
            accessLogs: accessLogs || [],
            recordCount: accessLogs?.length || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: "Unknown action",
            availableActions: ["health", "log-event", "dashboard", "gdpr-audit"],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    log("error", "Security monitor error", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Correlation-ID": correlationId },
      }
    );
  }
});
