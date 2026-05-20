import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function SmartDailyBriefing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cacheKey = `hiit_daily_briefing_${new Date().toISOString().split("T")[0]}`;

  const fetchBriefing = async (force = false) => {
    if (!user) return;

    // Check cache
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setInsight(cached);
        return;
      }
    }

    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("smart-insights", {
        body: { type: "daily-briefing" },
      });

      if (fnError) throw fnError;
      if (data?.insight) {
        setInsight(data.insight);
        localStorage.setItem(cacheKey, data.insight);
      }
    } catch (e) {
      console.error("Daily briefing error:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, [user]);

  if (!user) return null;

  return (
    <div className="px-6 py-2">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5",
          "border border-primary/15",
          "p-4"
        )}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                Today's Briefing
              </p>
              <button
                onClick={() => fetchBriefing(true)}
                disabled={loading}
                className="p-1 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
              </button>
            </div>

            {loading && !insight ? (
              <div className="space-y-2">
                <div className="h-3 bg-primary/10 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-primary/10 rounded-full w-4/5 animate-pulse" />
                <div className="h-3 bg-primary/10 rounded-full w-3/5 animate-pulse" />
              </div>
            ) : error && !insight ? (
              <p className="text-sm text-muted-foreground">
                Couldn't load your briefing. Tap refresh to try again.
              </p>
            ) : insight ? (
              <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-line">
                {insight}
              </p>
            ) : null}

            {insight && (
              <button
                onClick={() => navigate("/weekly-report")}
                className="flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View Weekly Report
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
