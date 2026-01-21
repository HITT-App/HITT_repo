import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useActivity } from "@/hooks/useActivity";

const ActivityTracker = () => {
  const navigate = useNavigate();
  const { preferences, preferencesLoading } = useActivity();

  useEffect(() => {
    if (!preferencesLoading) {
      if (preferences?.onboarding_completed) {
        navigate("/activity-dashboard", { replace: true });
      } else {
        navigate("/activity-onboarding", { replace: true });
      }
    }
  }, [preferences, preferencesLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
};

export default ActivityTracker;
