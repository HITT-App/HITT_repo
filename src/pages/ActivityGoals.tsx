import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Flame, Timer, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useActivity } from "@/hooks/useActivity";
import { toast } from "sonner";

const ActivityGoals = () => {
  const navigate = useNavigate();
  const { goals, weeklyStats, saveGoals } = useActivity();

  const [weeklyActivities, setWeeklyActivities] = useState(5);
  const [weeklyDistance, setWeeklyDistance] = useState(10);
  const [weeklyCalories, setWeeklyCalories] = useState(1500);
  const [weeklyDuration, setWeeklyDuration] = useState(150);

  useEffect(() => {
    if (goals) {
      setWeeklyActivities(goals.weekly_activities || 5);
      setWeeklyDistance(Number(goals.weekly_distance_km) || 10);
      setWeeklyCalories(goals.weekly_calories || 1500);
      setWeeklyDuration(goals.weekly_duration_minutes || 150);
    }
  }, [goals]);

  const handleSave = async () => {
    try {
      await saveGoals.mutateAsync({
        weekly_activities: weeklyActivities,
        weekly_distance_km: weeklyDistance,
        weekly_calories: weeklyCalories,
        weekly_duration_minutes: weeklyDuration,
      });
      toast.success("Goals updated successfully!");
      navigate(-1);
    } catch (error) {
      console.error("[ActivityGoals] saveGoals failed:", error);
      toast.error("Failed to update goals");
    }
  };

  const activitiesProgress = Math.min((weeklyStats.activities / weeklyActivities) * 100, 100);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Activity Goal</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Weekly Progress Ring */}
        <Card className="p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={`${activitiesProgress * 2.83} 283`}
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div>
                <div className="text-4xl font-bold">{weeklyStats.activities}</div>
              </div>
            </div>
          </div>
          <h2 className="text-lg font-semibold">Activities per week</h2>
          <p className="text-sm text-muted-foreground">
            You've done {weeklyStats.activities} activities this week.
          </p>
        </Card>

        {/* Edit Goals */}
        <div>
          <h2 className="font-semibold mb-4">Edit Activity Goal</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Here you can edit your weekly activity goal with ease.
          </p>

          {/* Weekly Activities */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Weekly Activities</h3>
                <p className="text-sm text-muted-foreground">{weeklyActivities} activities weekly</p>
              </div>
            </div>
            <Slider
              value={[weeklyActivities]}
              onValueChange={([val]) => setWeeklyActivities(val)}
              min={1}
              max={14}
              step={1}
            />
          </Card>

          {/* Weekly Distance */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Footprints className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Weekly Distance</h3>
                <p className="text-sm text-muted-foreground">{weeklyDistance} km/week</p>
              </div>
            </div>
            <Slider
              value={[weeklyDistance]}
              onValueChange={([val]) => setWeeklyDistance(val)}
              min={1}
              max={100}
              step={1}
            />
          </Card>

          {/* Weekly Calories */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Weekly Calorie Burn</h3>
                <p className="text-sm text-muted-foreground">{weeklyCalories} kcal</p>
              </div>
            </div>
            <Slider
              value={[weeklyCalories]}
              onValueChange={([val]) => setWeeklyCalories(val)}
              min={500}
              max={5000}
              step={100}
            />
          </Card>

          {/* Weekly Duration */}
          <Card className="p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Weekly Duration</h3>
                <p className="text-sm text-muted-foreground">{weeklyDuration} min</p>
              </div>
            </div>
            <Slider
              value={[weeklyDuration]}
              onValueChange={([val]) => setWeeklyDuration(val)}
              min={30}
              max={600}
              step={30}
            />
          </Card>
        </div>

        <Button 
          className="w-full" 
          onClick={handleSave}
          disabled={saveGoals.isPending}
        >
          {saveGoals.isPending ? "Saving..." : "Update Goal"}
        </Button>
      </div>
    </div>
  );
};

export default ActivityGoals;
