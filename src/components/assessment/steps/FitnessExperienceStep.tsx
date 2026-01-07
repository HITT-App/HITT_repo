import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface FitnessExperienceStepProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  onContinue: () => void;
}

export const FitnessExperienceStep = ({
  value,
  onChange,
  onContinue,
}: FitnessExperienceStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          Do you have a previous fitness experience?
        </h1>

        {/* Image placeholder */}
        <div className="aspect-square max-w-[280px] mx-auto mb-8 rounded-2xl overflow-hidden bg-muted">
          <div className="w-full h-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center">
            <span className="text-8xl">🏋️</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={() => {
            onChange(true);
            onContinue();
          }}
          className="w-full btn-primary"
        >
          Yes, I Have
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onChange(false);
            onContinue();
          }}
          className="w-full text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          No, I Don't Have
        </Button>
      </div>
    </div>
  );
};
