import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export const NameStep = ({ value, onChange, onContinue }: NameStepProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          What's your full legal name?
        </h1>

        <div className="mt-8">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your name..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`text-center text-lg h-14 border-2 transition-colors ${
              isFocused || value
                ? "border-primary bg-primary/5"
                : "border-input"
            }`}
          />
          <p className="text-sm text-muted-foreground text-center mt-3">
            For regulatory purposes, please enter name stated on your state ID.
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!value.trim()}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
