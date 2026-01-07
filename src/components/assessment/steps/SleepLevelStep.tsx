import { Button } from "@/components/ui/button";
import { ArrowRight, Moon } from "lucide-react";

interface SleepLevelStepProps {
  value: number;
  onChange: (value: number) => void;
  onContinue: () => void;
}

const sleepLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];
const sleepHours = ["< 4 hours", "4 - 5 hours", "5 - 6 hours", "6 - 7 hours", "7+ hours"];

export const SleepLevelStep = ({
  value,
  onChange,
  onContinue,
}: SleepLevelStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          How would you rate your sleep level?
        </h1>

        {/* Sleep Display */}
        <div className="text-center mb-8">
          <div className="text-7xl font-bold text-foreground mb-2">{value}</div>
          <div className="text-xl text-muted-foreground">{sleepLabels[value - 1]}</div>
        </div>

        {/* Rating Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={`w-12 h-12 rounded-lg text-lg font-medium transition-all ${
                value === level
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Sleep Hours Info */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Moon className="w-4 h-4" />
          <span className="text-sm">I sleep {sleepHours[value - 1]} daily</span>
        </div>
      </div>

      {/* Continue Button */}
      <Button onClick={onContinue} className="w-full btn-primary">
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
