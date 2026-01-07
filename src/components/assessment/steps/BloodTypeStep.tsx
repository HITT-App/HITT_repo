import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Minus } from "lucide-react";

interface BloodTypeStepProps {
  type: string;
  rh: "+" | "-";
  onTypeChange: (type: string) => void;
  onRhChange: (rh: "+" | "-") => void;
  onContinue: () => void;
}

const bloodTypes = ["A", "B", "AB", "O"];

export const BloodTypeStep = ({
  type,
  rh,
  onTypeChange,
  onRhChange,
  onContinue,
}: BloodTypeStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          What's your official blood type?
        </h1>

        {/* Blood Type Selector */}
        <div className="flex bg-muted rounded-lg p-1 mb-8">
          {bloodTypes.map((bt) => (
            <button
              key={bt}
              onClick={() => onTypeChange(bt)}
              className={`flex-1 py-3 rounded-md text-sm font-medium transition-all ${
                type === bt
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {bt}
            </button>
          ))}
        </div>

        {/* Large Blood Type Display */}
        <div className="flex justify-center items-center gap-8 mb-8">
          <span className="text-[120px] font-bold text-primary leading-none">
            {type || "A"}
          </span>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onRhChange("+")}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                rh === "+"
                  ? "bg-destructive text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
            <button
              onClick={() => onRhChange("-")}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                rh === "-"
                  ? "bg-destructive text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Minus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!type}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
