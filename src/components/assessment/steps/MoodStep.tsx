import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface MoodStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

const moods = [
  { id: "very-sad", emoji: "😢", label: "Very Sad" },
  { id: "sad", emoji: "😔", label: "Sad" },
  { id: "neutral", emoji: "😐", label: "Neutral" },
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "very-happy", emoji: "😄", label: "Very Happy" },
];

export const MoodStep = ({ value, onChange, onContinue }: MoodStepProps) => {
  const selectedMood = moods.find((m) => m.id === value);

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-8">
          What's your current mood right now?
        </h1>

        {/* Selected Mood Display */}
        <div className="flex justify-center mb-8">
          <div className="text-[100px]">{selectedMood?.emoji || "😊"}</div>
        </div>

        {/* Mood Label */}
        <div className="text-center mb-8">
          <p className="text-lg text-muted-foreground">
            I'm feeling{" "}
            <span className="text-foreground font-medium">
              {selectedMood?.label.toLowerCase() || "..."}
            </span>
          </p>
        </div>

        {/* Mood Selector */}
        <div className="flex justify-center gap-4">
          {moods.map((mood) => (
            <button
              key={mood.id}
              onClick={() => onChange(mood.id)}
              className={`text-4xl p-2 rounded-full transition-all ${
                value === mood.id
                  ? "scale-110 bg-primary/20"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              {mood.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={!value}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
