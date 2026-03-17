import { useState, useEffect } from "react";
import { Sparkles, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { CompletionStat } from "./CompletionSummary";

interface PostActivityInsightProps {
  activityTitle: string;
  activityType?: string;
  stats: CompletionStat[];
}

export function PostActivityInsight({ activityTitle, activityType, stats }: PostActivityInsightProps) {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const durationStat = stats.find(s => s.label.toLowerCase().includes("duration") || s.label.toLowerCase().includes("time"));
    const calStat = stats.find(s => s.label.toLowerCase().includes("cal"));
    const distStat = stats.find(s => s.label.toLowerCase().includes("distance") || s.label.toLowerCase().includes("km"));

    supabase.functions.invoke("smart-insights", {
      body: {
        type: "post-activity",
        activityData: {
          title: activityTitle,
          type: activityType || "workout",
          duration: durationStat ? `${durationStat.value} ${durationStat.unit || ""}`.trim() : undefined,
          calories: calStat?.value,
          distance: distStat ? `${distStat.value} ${distStat.unit || ""}`.trim() : undefined,
        },
      },
    }).then(({ data, error }) => {
      if (!error && data?.insight) setInsight(data.insight);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user || (!loading && !insight)) return null;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl",
      "bg-gradient-to-r from-accent/10 via-primary/5 to-primary/10",
      "border border-primary/15",
      "p-4"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">AI Insight</p>
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3 bg-primary/10 rounded-full w-full animate-pulse" />
              <div className="h-3 bg-primary/10 rounded-full w-3/4 animate-pulse" />
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-foreground/85">{insight}</p>
          )}
        </div>
      </div>
    </div>
  );
}
