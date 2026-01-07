import { Button } from "@/components/ui/button";
import { ArrowRight, Minus, Plus, HelpCircle } from "lucide-react";

interface CalorieIntakeStepProps {
  value: number;
  onChange: (value: number) => void;
  onContinue: () => void;
}

export const CalorieIntakeStep = ({
  value,
  onChange,
  onContinue,
}: CalorieIntakeStepProps) => {
  const increment = () => onChange(Math.min(10000, value + 100));
  const decrement = () => onChange(Math.max(0, value - 100));

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          What's your daily calorie intake?
        </h1>

        {/* Label */}
        <div className="text-sm text-muted-foreground mb-4">
          Daily Intake (kcal)
        </div>

        {/* Calorie Counter */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <button
            onClick={decrement}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-6xl font-bold text-foreground">
              {value.toLocaleString()}
            </span>
          </div>

          <button
            onClick={increment}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <p className="text-center text-muted-foreground">
          I consume around{" "}
          <span className="text-foreground font-medium">
            {value.toLocaleString()} kcal.
          </span>
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onContinue}
          disabled={value === 0}
          className="w-full btn-primary"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground">
          <HelpCircle className="w-4 h-4 mr-2" />
          I don't know
        </Button>
      </div>
    </div>
  );
};
