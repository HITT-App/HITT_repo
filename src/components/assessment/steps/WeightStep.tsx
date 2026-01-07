import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface WeightStepProps {
  value: number;
  unit: "lbs" | "kg";
  onChange: (value: number) => void;
  onUnitChange: (unit: "lbs" | "kg") => void;
  onContinue: () => void;
}

export const WeightStep = ({
  value,
  unit,
  onChange,
  onUnitChange,
  onContinue,
}: WeightStepProps) => {
  const minWeight = unit === "lbs" ? 66 : 30;
  const maxWeight = unit === "lbs" ? 440 : 200;

  const convertWeight = (w: number, from: "lbs" | "kg", to: "lbs" | "kg") => {
    if (from === to) return w;
    return from === "lbs" ? Math.round(w * 0.453592) : Math.round(w * 2.20462);
  };

  const handleUnitChange = (newUnit: "lbs" | "kg") => {
    const newValue = convertWeight(value, unit, newUnit);
    onChange(newValue);
    onUnitChange(newUnit);
  };

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          What is your weight?
        </h1>

        {/* Unit Toggle */}
        <div className="flex bg-muted rounded-lg p-1 mb-8 w-fit">
          <button
            onClick={() => handleUnitChange("lbs")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              unit === "lbs"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            lbs
          </button>
          <button
            onClick={() => handleUnitChange("kg")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              unit === "kg"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            kg
          </button>
        </div>

        {/* Weight Display */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center">
            <span className="text-7xl font-bold text-foreground">{value}</span>
            <span className="text-2xl text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>

        {/* Slider */}
        <div className="px-4">
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={minWeight}
            max={maxWeight}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{minWeight}</span>
            <span>{maxWeight}</span>
          </div>
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
