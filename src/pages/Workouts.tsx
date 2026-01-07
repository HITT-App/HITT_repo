import { ArrowLeft, Dumbbell, Play, Clock, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const workouts = [
  { id: 1, name: "Full Body HIIT", duration: "30 min", calories: "350", level: "Intermediate" },
  { id: 2, name: "Upper Body Strength", duration: "45 min", calories: "280", level: "Beginner" },
  { id: 3, name: "Core Blast", duration: "20 min", calories: "200", level: "All Levels" },
  { id: 4, name: "Cardio Burn", duration: "40 min", calories: "450", level: "Advanced" },
];

const Workouts = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Workouts</h1>
      </header>

      <div className="p-4 space-y-4">
        {workouts.map((workout) => (
          <Card key={workout.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{workout.name}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {workout.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {workout.calories} cal
                  </span>
                </div>
                <span className="text-xs text-primary mt-1 inline-block">{workout.level}</span>
              </div>
              <Button size="icon" className="rounded-full">
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Workouts;
