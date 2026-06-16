import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyInsight {
  text: string;
  type: "ai" | "rule";
}

export function useDailyInsight() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const todayUTC = new Date().toISOString().split("T")[0];

    const run = async () => {
      // Try cache first — render immediately if today's insight exists
      const { data: cached } = await supabase
        .from("daily_insights")
        .select("insight_text, insight_type, generated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cached?.generated_at === todayUTC) {
        setInsight({ text: cached.insight_text, type: cached.insight_type as "ai" | "rule" });
        setLoading(false);
        return;
      }

      // Show stale insight while regenerating in background
      if (cached) {
        setInsight({ text: cached.insight_text, type: cached.insight_type as "ai" | "rule" });
        setLoading(false);
      }

      // Regenerate (background if stale, foreground if first-ever)
      try {
        const { data, error } = await supabase.functions.invoke("generate-daily-insight", { body: {} });
        if (!error && data?.insight) {
          setInsight({ text: data.insight, type: data.type ?? "rule" });
        }
      } catch {
        // Silently ignore — stale or null insight is fine
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user]);

  return { insight, loading };
}
