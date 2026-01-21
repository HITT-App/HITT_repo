import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSleep } from "@/hooks/useSleep";
import { Loader2 } from "lucide-react";

const SleepTracker = () => {
  const navigate = useNavigate();
  const { preferences, preferencesLoading } = useSleep();

  useEffect(() => {
    if (!preferencesLoading) {
      if (preferences?.onboarding_completed) {
        navigate("/sleep-dashboard", { replace: true });
      } else {
        navigate("/sleep-onboarding", { replace: true });
      }
    }
  }, [preferences, preferencesLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default SleepTracker;
