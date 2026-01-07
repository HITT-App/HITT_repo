import { Button } from "@/components/ui/button";
import { HIITLogo } from "@/components/HIITLogo";
import { ArrowRight, HelpCircle } from "lucide-react";

interface WelcomeStepProps {
  onContinue: () => void;
}

export const WelcomeStep = ({ onContinue }: WelcomeStepProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 pb-10">
      {/* Top Section with Stepper */}
      <div className="w-full">
        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-2">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <span className="text-xs text-foreground font-medium">Assessment</span>
          </div>
          <div className="w-12 h-px bg-muted" />
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Personal Info</span>
          </div>
          <div className="w-12 h-px bg-muted" />
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Choose Plan</span>
          </div>
        </div>
      </div>

      {/* Center Content */}
      <div className="flex flex-col items-center text-center">
        <HIITLogo variant="orange" className="w-24 h-24 mb-8" />
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Let's fully set up your HIIT account.
        </h1>
        <p className="text-muted-foreground">
          First, let's start with a comprehensive fitness assessment.
        </p>
      </div>

      {/* Bottom Buttons */}
      <div className="w-full space-y-3">
        <Button onClick={onContinue} className="w-full btn-primary">
          I'm Ready
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground">
          <HelpCircle className="w-4 h-4 mr-2" />
          I need help
        </Button>
      </div>
    </div>
  );
};
