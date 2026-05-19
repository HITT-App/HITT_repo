import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Bot, FileText, User, LayoutGrid } from "lucide-react";
import { HEmoji } from "@/components/HEmoji";

interface TutorialStep {
  title: string;
  description: string;
  highlight: "bottom-nav" | "center-button" | "none";
}

const steps: TutorialStep[] = [
  {
    title: "This is your primary tab bar",
    description: "Please use this to navigate throughout the app. Hit continue to see more details.",
    highlight: "bottom-nav",
  },
  {
    title: "Explore all features",
    description: "Tap the center button to access Health Metrics, Activity, Sleep, Nutrition, Workouts, Coaching, Community, AI Coach, and Resources.",
    highlight: "center-button",
  },
  {
    title: "You're all set!",
    description: "Start exploring your personalized fitness dashboard. Your AI coach is always ready to help.",
    highlight: "none",
  },
];

interface AppTutorialProps {
  onComplete: () => void;
}

export const AppTutorial = ({ onComplete }: AppTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleContinue = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]" onClick={handleContinue}>
      {/* Dimmed overlay — pointer-events-none so touches pass through to the card */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      {/* Tooltip card */}
      <div className="absolute bottom-28 left-4 right-4 max-w-md mx-auto animate-fade-up">
        <div className="bg-white rounded-2xl p-5 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
          {/* Arrow pointing down to nav */}
          {step.highlight !== "none" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
          )}

          <h3 className="text-lg font-bold text-foreground mb-1">{step.title}</h3>
          <p className="text-muted-foreground text-sm mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button onClick={handleContinue} size="sm" className="btn-primary">
              {isLast ? "Let's Go!" : "Continue"}
            </Button>
          </div>
        </div>
      </div>

      {/* Highlight the nav bar by keeping it visible */}
      {step.highlight === "center-button" && (
        <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-3">
          <div className="rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-elevated p-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "❤️", label: "Health Metr..." },
                { icon: "🏃", label: "Activity" },
                { icon: "😴", label: "Sleep" },
                { icon: "🥗", label: "Nutrition" },
                { icon: "💪", label: "Workouts" },
                { icon: "👨‍🏫", label: "Coach Book..." },
                { icon: "👥", label: "Community" },
                { icon: "🤖", label: "HIIT AI" },
                { icon: "📚", label: "Resources" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1 py-2">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg">
                    {item.icon === '💪' ? <HEmoji name="workouts" size={24}/> : item.icon === '👥' ? <HEmoji name="social" size={24}/> : item.icon === '🤖' ? <HEmoji name="ai" size={24}/> : <span className="text-2xl">{item.icon}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
