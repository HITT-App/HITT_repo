import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// /activity is a redirect stub — new users used to get gated through
// `/activity-onboarding` before seeing anything, but the onboarding was
// mostly a data-collection funnel whose outputs weren't actually driving
// the score or dashboard. ActivityDashboard renders cleanly with sensible
// defaults, so we send everyone straight there. Onboarding is still
// reachable at /activity-onboarding if we ever want to surface it from
// Settings.
const ActivityTracker = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/activity-dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
};

export default ActivityTracker;
