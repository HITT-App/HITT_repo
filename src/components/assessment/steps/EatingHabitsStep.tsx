import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface EatingHabitsStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

const habits = [
  {
    id: "balanced",
    label: "Balanced Diet",
    description: "I'm eating a very balanced diet",
    icon: "🥗",
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    description: "I eat a habits on my previous life",
    icon: "🥬",
  },
  {
    id: "low-carb",
    label: "Low Carb",
    description: "I am allergic to carbohydrates",
    icon: "🍖",
  },
  {
    id: "gluten-free",
    label: "Gluten Free",
    description: "I hate glutens with all of my life",
    icon: "🌾",
  },
];

export const EatingHabitsStep = ({
  value,
  onChange,
  onContinue,
}: EatingHabitsStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          What is your usual eating habits?
        </h1>

        <div className="grid grid-cols-2 gap-4">
          {habits.map((habit) => {
            const isSelected = value === habit.id;
            return (
              <button
                key={habit.id}
                onClick={() => onChange(habit.id)}
                className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <span className="text-3xl mb-2">{habit.icon}</span>
                <span className={`font-medium text-sm ${isSelected ? "text-foreground" : "text-foreground"}`}>
                  {habit.label}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {habit.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!value}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
