import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Undo, Redo, Trash2 } from "lucide-react";

interface FitnessNotesStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export const FitnessNotesStep = ({
  value,
  onChange,
  onContinue,
}: FitnessNotesStepProps) => {
  const maxLength = 100;
  const charCount = value.length;

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Do you have any additional fitness note?
        </h1>
        <p className="text-muted-foreground mb-8">
          Any medical or fitness notes will be helpful for coach HIIT AI. Feel free to write any.
        </p>

        {/* Textarea */}
        <div className="border-2 border-input rounded-xl p-4 focus-within:border-primary transition-colors">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
            placeholder="Enter your note..."
            className="border-0 p-0 resize-none min-h-[120px] focus-visible:ring-0"
          />
          
          {/* Toolbar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Undo className="w-4 h-4" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                <Redo className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChange("")}
                className="p-2 text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-muted-foreground">
              ✏️ {charCount}/{maxLength}
            </div>
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
