import { ArrowLeft, Heart, Activity, Scale, Footprints, Moon, Smile, ChevronRight, Sparkles, Loader2, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { useSleep } from "@/hooks/useSleep";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const HealthMetrics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getLatestValue, isLoading: metricsLoading } = useHealthMetrics();
  const { weeklyStats } = useSleep();

  // Get today's mood from daily_checkins
  const { data: todayMood } = useQuery({
    queryKey: ["today-mood", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_checkins")
        .select("mood")
        .eq("user_id", user!.id)
        .eq("date", today)
        .maybeSingle();
      return data?.mood || null;
    },
    enabled: !!user?.id,
  });

  // Get today's totals for steps and hydration
  const { data: todaySteps } = useQuery({
    queryKey: ["health-metrics-today", user?.id, "steps"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("health_metrics")
        .select("value")
        .eq("user_id", user!.id)
        .eq("metric_type", "steps")
        .gte("recorded_at", todayStart.toISOString());
      return (data || []).reduce((sum, row) => sum + Number(row.value), 0);
    },
    enabled: !!user?.id,
  });


  // Format sleep from weekly stats
  const sleepValue = weeklyStats.avgMinutes > 0
    ? `${weeklyStats.avgHours}h ${weeklyStats.avgRemainingMinutes}m`
    : null;

  // Capitalize mood
  const moodDisplay = todayMood
    ? todayMood.charAt(0).toUpperCase() + todayMood.slice(1)
    : null;

  const metrics = [
    {
      label: "Heart Rate",
      value: getLatestValue("heart_rate"),
      fallback: "--",
      unit: "bpm",
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-100",
      path: "/heart-rate",
    },
    {
      label: "Blood Pressure",
      value: getLatestValue("blood_pressure"),
      fallback: "--/--",
      unit: "mmHg",
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-100",
      path: "/blood-pressure",
    },
    {
      label: "Steps",
      value: todaySteps != null && todaySteps > 0 ? todaySteps.toLocaleString() : null,
      fallback: "0",
      unit: "steps",
      icon: Footprints,
      color: "text-primary",
      bgColor: "bg-primary/10",
      path: "/steps",
    },
    {
      label: "Weight",
      value: getLatestValue("weight"),
      fallback: "--",
      unit: "kg",
      icon: Scale,
      color: "text-green-500",
      bgColor: "bg-green-100",
      path: "/weight",
    },

    {
      label: "Sleep",
      value: sleepValue,
      fallback: "--",
      unit: "",
      icon: Moon,
      color: "text-indigo-500",
      bgColor: "bg-indigo-100",
      path: "/sleep",
    },
    {
      label: "Mood",
      value: moodDisplay,
      fallback: "Not logged",
      unit: "",
      icon: Smile,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100",
      path: "/mood",
    },
    {
      label: "Body Scan",
      value: null,
      fallback: "Scan Now",
      unit: "",
      icon: ScanLine,
      color: "text-primary",
      bgColor: "bg-primary/10",
      path: "/body-scan",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center gap-3 px-4 py-3" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">My Fitness Metrics</h1>
      </header>

      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">See details about your health metrics.</p>

        {metricsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          metrics.map((metric) => {
            const Icon = metric.icon;
            const displayValue = metric.value || metric.fallback;
            return (
              <Card
                key={metric.label}
                className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(metric.path)}
              >
                <div className={`w-12 h-12 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-xl font-bold text-foreground">
                    {displayValue}{" "}
                    {metric.unit && <span className="text-sm font-normal text-muted-foreground">{metric.unit}</span>}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Card>
            );
          })
        )}

        {/* AI Recommendations */}
        <Card
          className="p-4 bg-primary/5 border-primary/20 cursor-pointer"
          onClick={() => navigate("/health-recommendations")}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">AI Recommendations</p>
              <p className="text-sm text-muted-foreground">Personalized health suggestions</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HealthMetrics;
