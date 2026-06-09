import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowLeft } from "lucide-react";
import { Analytics } from "@/lib/analytics";

const FeatureLocked = () => {
  const navigate = useNavigate();

  useEffect(() => { Analytics.premiumFeatureViewed(); }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full" />
          <div className="absolute inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-20 h-20 text-primary" />
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Feature Locked
        </h1>
        <p className="text-muted-foreground mb-8">
          This premium feature is available with HIIT Plus. Upgrade now to unlock personalized coaching and more!
        </p>

        {/* Benefits */}
        <div className="bg-secondary rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            HIIT Plus Benefits
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Personalized AI coaching
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Advanced workout analytics
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Custom meal plans
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              Priority support
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="w-full rounded-xl py-6 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeatureLocked;
