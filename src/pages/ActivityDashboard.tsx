import { useNavigate } from "react-router-dom";
import { HEmoji } from "@/components/HEmoji";
import { 
  Calendar,
  ChevronRight,
  Flame,
  Footprints,
  Timer,
  TrendingUp,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActivity } from "@/hooks/useActivity";
import { useProfile } from "@/hooks/useProfile";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, string> = {
  jogging: "🏃",
  swimming: "🏊",
  yoga: "🧘",
  "martial-arts": "🥋",
  aerobics: "💪",
  cycling: "🚴",
  walking: "🚶",
  other: "⚡",
};

const ActivityDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { 
    preferences, 
    preferencesLoading,
    goals,
    logs, 
    logsLoading,
    weeklyStats,
    activityScore,
    activityBreakdown,
    recommendations
  } = useActivity();

  // Redirect to onboarding if not completed
  if (!preferencesLoading && !preferences?.onboarding_completed) {
    navigate("/activity-onboarding");
    return null;
  }

  const scoreColor = activityScore >= 70 ? "text-green-500" : activityScore >= 40 ? "text-primary" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>{profile?.display_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">Activity</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/activity-history")}>
              <Calendar className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Activity Score */}
        <div className="text-center py-4">
          <div className={cn("text-5xl font-bold mb-1", scoreColor)}>{activityScore}</div>
          <p className="text-sm text-muted-foreground">Activity Score</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activityScore >= 70 
              ? "You are more active than usual this week." 
              : activityScore >= 40 
              ? "Keep going, you're on track!" 
              : "Let's log your first activity!"}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-around py-3 border-t border-border">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div className="font-semibold">{weeklyStats.calories}</div>
            <div className="text-xs text-muted-foreground">kcal</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Footprints className="w-5 h-5 text-primary" />
            </div>
            <div className="font-semibold">{weeklyStats.distance}</div>
            <div className="text-xs text-muted-foreground">km</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div className="font-semibold">{weeklyStats.minutes}</div>
            <div className="text-xs text-muted-foreground">min</div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Activity Insight */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Activity Insight
            </h2>
            <Button variant="link" size="sm" className="text-primary p-0">
              See All
            </Button>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <Flame className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">{weeklyStats.calories} kcal</div>
                <div className="text-sm text-muted-foreground">Calories Burned</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {weeklyStats.calories > 0 
                ? `You've burned a total of ${weeklyStats.calories} kcal this week` 
                : "No data to show yet. Log your first activity!"}
            </p>
          </Card>
        </div>

        {/* Activity History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Activity History</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0"
              onClick={() => navigate("/activity-history")}
            >
              See All
            </Button>
          </div>
          
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Let's log your first activity in order to see your history</p>
              <Button variant="link" className="text-primary" onClick={() => navigate("/log-activity")}>
                Log Activity →
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 3).map((log) => (
                <Card 
                  key={log.id} 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/activity/${log.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {(activityIcons[log.activity_type] || "⚡") === '💪' ? <HEmoji name="workouts" size={16}/> : <span className="text-xl">{activityIcons[log.activity_type] || "⚡"}</span>}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium capitalize">{log.activity_type.replace("-", " ")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(log.started_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{Math.round((log.duration_seconds || 0) / 60)} min</span>
                        <span><HEmoji name="streak" size={14} style={{verticalAlign:'middle'}}/> {log.calories_burned || 0} kcal</span>
                      </div>
                      <div className="text-primary text-xs">+{log.score_impact} score</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Goal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Activity Goal
            </h2>
            <Button variant="link" size="sm" className="text-primary p-0" onClick={() => navigate("/activity-goals")}>
              Edit
            </Button>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Footprints className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="font-semibold">{goals?.weekly_activities || 5} Exercises</div>
                <div className="text-sm text-muted-foreground">Weekly Target</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold">{goals?.weekly_calories || 1500}</div>
                <div className="text-muted-foreground">kcal goal</div>
              </div>
              <div>
                <div className="font-semibold">{goals?.weekly_duration_minutes || 150}</div>
                <div className="text-muted-foreground">min goal</div>
              </div>
              <div>
                <div className="font-semibold">{goals?.weekly_distance_km || 10}</div>
                <div className="text-muted-foreground">km goal</div>
              </div>
            </div>
            <Progress 
              value={(weeklyStats.activities / (goals?.weekly_activities || 5)) * 100} 
              className="mt-4 h-2" 
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {weeklyStats.activities} of {goals?.weekly_activities || 5} activities this week
            </p>
          </Card>
        </div>

      </div>

    </div>
  );
};

export default ActivityDashboard;
