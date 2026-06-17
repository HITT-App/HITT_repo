import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDailyInsight } from "@/hooks/useDailyInsight";
import { HIITLogo } from "@/components/HIITLogo";

export function AICoachSection() {
  const { insight, loading } = useDailyInsight();

  return (
    <div className="px-5 py-2">
      <Card className="p-4 bg-card border border-border/60 rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <HIITLogo size="md" showGlow />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">HIIT AI Coach</h3>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            {loading && !insight ? (
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse mt-1" />
            ) : (
              <p className="text-sm text-muted-foreground leading-snug">
                {insight?.text ?? "Keep showing up — consistency is everything."}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
