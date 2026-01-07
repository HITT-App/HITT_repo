import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, TrendingUp, Bot, Activity, Users, Sparkles } from "lucide-react";

interface GoalsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onContinue: () => void;
}

const goals = [
  { id: "get-ripped", label: "I wanna get ripped", icon: Dumbbell },
  { id: "improve-fitness", label: "I want to improve fitness", icon: TrendingUp },
  { id: "ai-coach", label: "I wanna try AI Coach", icon: Bot },
  { id: "monitor-metrics", label: "Monitor my fitness metrics", icon: Activity },
  { id: "find-coach", label: "I want to find fitness coach", icon: Users },
  { id: "try-app", label: "Just wanna try the app", icon: Sparkles },
];

export const GoalsStep = ({ value, onChange, onContinue }: GoalsStepProps) => {
  const toggleGoal = (goalId: string) => {
    if (value.includes(goalId)) {
      onChange(value.filter((id) => id !== goalId));
    } else {
      onChange([...value, goalId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          What is your health goal for the app?
        </h1>

        <div className="space-y-3">
          {goals.map((goal) => {
            const isSelected = value.includes(goal.id);
            const Icon = goal.icon;
            return (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {goal.label}
                </span>
                <div
                  className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={value.length === 0}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
