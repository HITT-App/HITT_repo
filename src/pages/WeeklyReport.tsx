import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const WeeklyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const weekKey = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return `hiit_weekly_report_${start.toISOString().split("T")[0]}`;
  })();

  const fetchReport = async (force = false) => {
    if (!user) return;

    if (!force) {
      const cached = localStorage.getItem(weekKey);
      if (cached) { setReport(cached); setLoading(false); return; }
    }

    setLoading(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("smart-insights", {
        body: { type: "weekly-report" },
      });
      if (fnError) throw fnError;
      if (data?.insight) {
        setReport(data.insight);
        localStorage.setItem(weekKey, data.insight);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [user]);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-b from-primary/15 via-primary/5 to-background pt-12 pb-8 px-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.1),_transparent_70%)] pointer-events-none" />
          <button onClick={() => navigate(-1)} className="relative mb-4 p-2 -ml-2 rounded-xl hover:bg-primary/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="relative flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Weekly Report</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(weekStart)} – {formatDate(weekEnd)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-28">
          {loading ? (
            <div className="space-y-4 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded-full w-32 animate-pulse" />
                  <div className="h-3 bg-muted/60 rounded-full w-full animate-pulse" />
                  <div className="h-3 bg-muted/60 rounded-full w-4/5 animate-pulse" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Couldn't generate your report.</p>
              <Button onClick={() => fetchReport(true)} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          ) : report ? (
            <div className={cn(
              "bg-card border border-border/60 rounded-2xl p-5",
              "text-[13px] leading-[1.85] text-foreground/85",
              "[&>p]:mb-3",
              "[&>h1]:text-[17px] [&>h1]:font-bold [&>h1]:text-foreground [&>h1]:mt-5 [&>h1]:mb-2",
              "[&>h2]:text-[16px] [&>h2]:font-bold [&>h2]:text-foreground [&>h2]:mt-5 [&>h2]:mb-2",
              "[&>ul]:space-y-1.5 [&>ul]:mb-3 [&>ul]:pl-1",
              "[&>ul>li]:text-foreground/80",
            )}>
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          ) : null}

          {!loading && (
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => fetchReport(true)}
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                disabled={loading}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
