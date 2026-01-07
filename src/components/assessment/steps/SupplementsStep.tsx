import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface SupplementsStepProps {
  takeSupplements: boolean | null;
  onTakeChange: (value: boolean) => void;
  onContinue: () => void;
}

export const SupplementsStep = ({
  takeSupplements,
  onTakeChange,
  onContinue,
}: SupplementsStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          Are you taking any fitness supplements?
        </h1>

        {/* Image placeholder */}
        <div className="aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-muted">
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-8xl">💪</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={() => {
            onTakeChange(true);
            onContinue();
          }}
          className="w-full btn-primary"
        >
          Yes, I take them
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onTakeChange(false);
            onContinue();
          }}
          className="w-full text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          No, I don't
        </Button>
      </div>
    </div>
  );
};
