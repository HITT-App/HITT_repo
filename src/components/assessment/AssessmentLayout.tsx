import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface AssessmentLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export const AssessmentLayout = ({
  children,
  currentStep,
  totalSteps,
  onBack,
  onSkip,
  showSkip = true,
}: AssessmentLayoutProps) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            className="text-primary font-medium text-sm hover:underline"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
