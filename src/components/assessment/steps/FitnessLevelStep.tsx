import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FitnessLevelStepProps {
  value: number;
  onChange: (value: number) => void;
  onContinue: () => void;
}

const levels = [
  { level: 1, label: "Sedentary", description: "I rarely exercise" },
  { level: 2, label: "Light", description: "I exercise 1 - 2 times weekly" },
  { level: 3, label: "Moderate", description: "I exercise 2 - 3 times weekly" },
  { level: 4, label: "Athletic", description: "I exercise 3 - 4 times weekly" },
  { level: 5, label: "Elite", description: "I exercise 5+ times weekly" },
];

export const FitnessLevelStep = ({
  value,
  onChange,
  onContinue,
}: FitnessLevelStepProps) => {
  const currentLevel = levels.find((l) => l.level === value) || levels[2];

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          How would you rate your fitness level?
        </h1>

        {/* Level Display */}
        <div className="text-center mb-8">
          <div className="text-sm text-primary font-medium mb-2">
            LEVEL {value}
          </div>

          {/* Slider Track with Gradient */}
          <div className="relative h-8 rounded-full overflow-hidden bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 mb-6">
            {/* Slider Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-foreground rounded-full border-2 border-white shadow-lg transition-all"
              style={{ left: `calc(${((value - 1) / 4) * 100}% - 12px)` }}
            />
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2">
            {currentLevel.label}
          </h2>
          <p className="text-muted-foreground">{currentLevel.description}</p>
        </div>

        {/* Slider Control */}
        <div className="px-2">
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground text-center mt-4">
            ◎ Drag the slider to adjust
          </p>
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
