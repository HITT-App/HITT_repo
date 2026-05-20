import { ChevronRight, Plus, Footprints, PersonStanding } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ActivitySectionProps {
  completedActivities?: number;
  totalActivities?: number;
  recentActivities?: Array<{
    id: string;
    type: string;
    date: string;
    time: string;
    duration: number;
    calories: number;
    heartRate?: number;
    score?: number;
  }>;
}

export function ActivitySection({
  completedActivities = 2,
  totalActivities = 5,
  recentActivities = [],
}: ActivitySectionProps) {
  const navigate = useNavigate();
  const progress = (completedActivities / totalActivities) * 100;

  const defaultActivities = [
    {
      id: "1",
      type: "Walking",
      date: "Today",
      time: "10:00 AM - 10:30 AM",
      duration: 30,
      calories: 150,
      heartRate: 105,
      score: 12,
    },
    {
      id: "2",
      type: "Yoga",
      date: "Yesterday",
      time: "10:00 AM - 10:30 AM",
      duration: 30,
      calories: 108,
      heartRate: 88,
      score: 13,
    },
  ];

  const activities = recentActivities.length > 0 ? recentActivities : defaultActivities;

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "walking":
        return <Footprints className="w-5 h-5 text-primary" />;
      case "yoga":
        return <PersonStanding className="w-5 h-5 text-indigo-500" />;
      default:
        return <Footprints className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="px-6 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/activity-dashboard")}
        >
          See All
        </Button>
      </div>

      {/* Progress Card */}
      <Card className="p-4 bg-card border border-border/60 mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            {completedActivities} out of {totalActivities}
          </p>
          <span className="text-xs text-muted-foreground">
            {totalActivities - completedActivities} activities left for this week.
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto mt-3 text-sm"
          onClick={() => navigate("/log-activity")}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add New Activity
        </Button>
      </Card>

      {/* Recent Activities */}
      <div className="space-y-2">
        {activities.map((activity) => (
          <Card 
            key={activity.id} 
            className="p-3 bg-card border border-border/60"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{activity.type}</p>
                  <span className="text-xs text-muted-foreground">{activity.date}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{activity.time}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{activity.duration} min</span>
                  <span>{activity.calories} kcal</span>
                  {activity.heartRate && <span>{activity.heartRate} avg bpm</span>}
                  {activity.score && <span>+{activity.score} score</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
