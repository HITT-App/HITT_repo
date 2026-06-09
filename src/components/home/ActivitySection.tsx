import { useEffect, useState } from "react";
import { ChevronRight, Plus, Footprints, PersonStanding, Dumbbell, Bike, Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday } from "date-fns";

interface ActivityLog {
  id: string;
  activity_type: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
}

function formatActivityDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function formatActivityTime(started: string, ended: string | null) {
  const s = format(new Date(started), "h:mm a");
  if (!ended) return s;
  return `${s} – ${format(new Date(ended), "h:mm a")}`;
}

function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case "walking":
    case "hiking":
      return <Footprints className="w-5 h-5 text-primary" />;
    case "yoga":
    case "pilates":
    case "mindandbody":
    case "taiChi":
      return <PersonStanding className="w-5 h-5 text-indigo-500" />;
    case "cycling":
    case "bikingstationary":
      return <Bike className="w-5 h-5 text-green-500" />;
    case "swimming":
    case "swimmingpool":
    case "swimmingOpenWater":
      return <Waves className="w-5 h-5 text-blue-500" />;
    default:
      return <Dumbbell className="w-5 h-5 text-orange-500" />;
  }
}

function formatActivityType(type: string) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function ActivitySection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("activity_logs")
      .select("id, activity_type, started_at, ended_at, duration_seconds, calories_burned, avg_heart_rate")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const completedThisWeek = activities.filter((a) => {
    const d = new Date(a.started_at);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart;
  }).length;

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/activity-dashboard")}
        >
          See All <ChevronRight className="w-3 h-3 ml-0.5" />
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="p-4 bg-card border border-border/60 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            {completedThisWeek} this week
          </p>
        </div>
        <Progress value={Math.min((completedThisWeek / 5) * 100, 100)} className="h-2" />
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto mt-3 text-sm"
          onClick={() => navigate("/log-activity")}
        >
          <Plus className="w-4 h-4 mr-1" />
          Log Activity
        </Button>
      </Card>

      {/* Recent Activities */}
      {!loading && activities.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No activities yet. Complete a workout or sync HealthKit to see them here.
        </p>
      )}
      <div className="space-y-2">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-3 bg-card border border-border/60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{formatActivityType(activity.activity_type)}</p>
                  <span className="text-xs text-muted-foreground">{formatActivityDate(activity.started_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {formatActivityTime(activity.started_at, activity.ended_at)}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {activity.duration_seconds != null && (
                    <span>{Math.round(activity.duration_seconds / 60)} min</span>
                  )}
                  {activity.calories_burned != null && (
                    <span>{activity.calories_burned} kcal</span>
                  )}
                  {activity.avg_heart_rate != null && (
                    <span>{activity.avg_heart_rate} avg bpm</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
