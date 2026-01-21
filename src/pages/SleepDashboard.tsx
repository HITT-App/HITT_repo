import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Plus, 
  ChevronRight,
  Clock,
  TrendingUp,
  Sparkles,
  Calendar,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSleep } from "@/hooks/useSleep";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

const SleepDashboard = () => {
  const navigate = useNavigate();
  const { 
    preferences, 
    preferencesLoading,
    activeSchedule,
    logs,
    logsLoading,
    weeklyLogs,
    recommendations,
    sleepScore,
    weeklyStats
  } = useSleep();

  // Redirect to onboarding if not completed
  if (!preferencesLoading && !preferences?.onboarding_completed) {
    navigate("/sleep-onboarding");
    return null;
  }

  const scoreColor = sleepScore >= 70 ? "text-green-500" : sleepScore >= 40 ? "text-primary" : "text-muted-foreground";

  // Get weekly consistency (which days have logs)
  const getWeeklyConsistency = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    
    return dayLabels.map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = date.toISOString().split("T")[0];
      return weeklyLogs.some(log => log.sleep_date === dateStr);
    });
  };

  const weeklyConsistency = getWeeklyConsistency();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Sleep Level</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/sleep-history")}>
              <Calendar className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/log-sleep")}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Date and Week View */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE")}
          </p>
          <p className="font-medium">{format(new Date(), "MMMM d, yyyy")}</p>
        </div>

        {/* Weekly Consistency */}
        <div className="flex justify-center gap-2 mb-6">
          {dayLabels.map((day, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs text-muted-foreground mb-1">{day}</span>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs",
                weeklyConsistency[index] 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {weeklyConsistency[index] ? "✓" : "✗"}
              </div>
            </div>
          ))}
        </div>

        {/* Sleep Score Circle */}
        <div className="flex flex-col items-center py-4">
          <div className="relative w-40 h-40">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(sleepScore / 100) * 440} 440`}
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", scoreColor)}>{sleepScore}</span>
              <span className="text-sm text-muted-foreground">Out of 100</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-around py-3 border-t border-border">
          <div className="text-center">
            <div className="font-semibold">
              {weeklyStats.avgHours}h {weeklyStats.avgRemainingMinutes}m
            </div>
            <div className="text-xs text-muted-foreground">Time Asleep</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{weeklyStats.avgQuality}%</div>
            <div className="text-xs text-muted-foreground">Sleep Quality</div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Sleep Insight */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Sleep Insight
            </h2>
            <Button variant="link" size="sm" className="text-primary p-0">
              See All
            </Button>
          </div>
          
          {weeklyStats.nightsLogged === 0 ? (
            <Card className="p-4">
              <h3 className="font-medium mb-1">Log your first sleep</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Let's log your first sleep to see your insight
              </p>
              <Button 
                variant="link" 
                className="text-primary p-0"
                onClick={() => navigate("/log-sleep")}
              >
                Log Sleep +
              </Button>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold">{weeklyStats.nightsLogged} nights</div>
                  <div className="text-sm text-muted-foreground">Logged this month</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Be sure to log your sleep metrics everyday to get accurate health results.
              </p>
            </Card>
          )}
        </div>

        {/* Sleep History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sleep History</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0"
              onClick={() => navigate("/sleep-history")}
            >
              See All
            </Button>
          </div>
          
          {logsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-2">No data to show</p>
              <p className="text-sm text-muted-foreground">You have no sleep data in your history</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 4).map((log) => (
                <Card 
                  key={log.id} 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/sleep/${log.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {Math.floor((log.duration_minutes || 0) / 60)}h {(log.duration_minutes || 0) % 60}m
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.sleep_quality || 0} sleep score
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(parseISO(log.sleep_date), "MMM d")}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sleep Schedule */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sleep Schedule</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0"
              onClick={() => navigate("/sleep-schedule")}
            >
              Edit Sleep Schedule
            </Button>
          </div>
          
          {!activeSchedule ? (
            <Card className="p-6 text-center">
              <Moon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium mb-1">You have no sleep schedule.</p>
              <p className="text-sm text-muted-foreground mb-4">
                Let's set up your sleep schedule so you can maintain your state of health.
              </p>
              <Button 
                variant="link" 
                className="text-primary"
                onClick={() => navigate("/sleep-schedule")}
              >
                Set Up Schedule +
              </Button>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-lg font-semibold mb-3">
                {preferences?.target_hours || 8}h {preferences?.target_minutes || 0}m
              </p>
              <p className="text-sm text-muted-foreground mb-4">This is your optimal sleep duration*</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bedtime</p>
                    <p className="font-medium">{activeSchedule.bedtime?.slice(0, 5)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Wake Up</p>
                    <p className="font-medium">{activeSchedule.wake_time?.slice(0, 5)}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sleep Goal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Sleep Goal</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0"
              onClick={() => navigate("/sleep-goal")}
            >
              Set Up Goal
            </Button>
          </div>
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <Moon className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm">
              Set up your daily sleep goal to improve your overall asklepios health score.
            </p>
          </Card>
        </div>

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Recommendations
            </h2>
            <Button variant="link" size="sm" className="text-primary p-0">
              See All
            </Button>
          </div>
          
          {recommendations.length === 0 ? (
            <Card className="p-6 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No recommendations yet</p>
              <p className="text-sm text-muted-foreground">Log more sleep data to get personalized tips</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {recommendations.slice(0, 2).map((rec) => (
                <Card key={rec.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                      Sleep
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rec.description}
                      </p>
                      <p className="text-xs text-primary mt-1">
                        +{rec.score_reward} Score Increase
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start Sleeping Button */}
      <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
        <Button 
          className="w-full"
          size="lg"
          onClick={() => navigate("/start-sleep")}
        >
          Start Sleeping
        </Button>
      </div>
    </div>
  );
};

export default SleepDashboard;
