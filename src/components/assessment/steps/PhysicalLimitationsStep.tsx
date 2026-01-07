import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";

interface PhysicalLimitationsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onContinue: () => void;
}

const limitations = [
  { id: "arthritis", label: "Arthritis" },
  { id: "back-pain", label: "Back Pain" },
  { id: "asthma", label: "Asthma" },
  { id: "knee-pain", label: "Knee Pain" },
  { id: "heart-condition", label: "Heart Condition" },
  { id: "diabetes", label: "Diabetes" },
];

export const PhysicalLimitationsStep = ({
  value,
  onChange,
  onContinue,
}: PhysicalLimitationsStepProps) => {
  const toggleLimitation = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removeLimitation = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          Do you have any physical limitations?
        </h1>

        {/* Image placeholder */}
        <div className="aspect-video max-w-[280px] mx-auto mb-8 rounded-2xl overflow-hidden bg-muted">
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <span className="text-6xl">♿</span>
          </div>
        </div>

        {/* Selected Limitations */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {value.map((id) => {
              const limitation = limitations.find((l) => l.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  {limitation?.label}
                  <button
                    onClick={() => removeLimitation(id)}
                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Quick Select */}
        <div className="flex flex-wrap gap-2">
          {limitations.map((limitation) => {
            const isSelected = value.includes(limitation.id);
            return (
              <button
                key={limitation.id}
                onClick={() => toggleLimitation(limitation.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {limitation.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-4">
          {value.length}/8
        </p>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button onClick={onContinue} className="w-full btn-primary">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="ghost"
          onClick={onContinue}
          className="w-full text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          I don't have any
        </Button>
      </div>
    </div>
  );
};
