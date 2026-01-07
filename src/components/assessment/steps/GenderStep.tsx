import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, X } from "lucide-react";

interface GenderStepProps {
  value: string;
  customGender: string;
  onChange: (value: string) => void;
  onCustomChange: (value: string) => void;
  onContinue: () => void;
}

const genders = [
  { id: "male", label: "I am Male", icon: "♂" },
  { id: "female", label: "I am Female", icon: "♀" },
  { id: "other", label: "I am Other", icon: "⚧" },
];

export const GenderStep = ({
  value,
  customGender,
  onChange,
  onCustomChange,
  onContinue,
}: GenderStepProps) => {
  const isComplete = value && (value !== "other" || customGender.trim());

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          What is your gender?
        </h1>
        <p className="text-muted-foreground mb-6">
          For the purpose of regulation, please specify your gender truthfully.
        </p>

        <div className="space-y-3">
          {genders.map((gender) => {
            const isSelected = value === gender.id;
            return (
              <button
                key={gender.id}
                onClick={() => onChange(gender.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <span className="text-2xl">{gender.icon}</span>
                <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {gender.label}
                </span>
                <div
                  className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}

          {value === "other" && (
            <div className="mt-4">
              <Input
                value={customGender}
                onChange={(e) => onCustomChange(e.target.value)}
                placeholder="Specify your gender..."
                className="border-2 border-primary bg-primary/5"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Axiom – A gender rooted in cosmic energy, combining like the forces of the universe.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onContinue}
          disabled={!isComplete}
          className="w-full btn-primary"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4 mr-2" />
          Prefer not to say
        </Button>
      </div>
    </div>
  );
};
