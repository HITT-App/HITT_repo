import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface MedicationsStepProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  onContinue: () => void;
}

export const MedicationsStep = ({
  value,
  onChange,
  onContinue,
}: MedicationsStepProps) => {
  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Are you taking any medications?
        </h1>
        <p className="text-muted-foreground mb-8">
          We are asking this to get accurate result.
        </p>

        {/* Image placeholder */}
        <div className="aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-muted">
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-8xl">💊</span>
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
          Yes, I take it
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            onChange(false);
            onContinue();
          }}
          className="w-full border-2"
        >
          Nope, I don't take it
        </Button>
      </div>
    </div>
  );
};
