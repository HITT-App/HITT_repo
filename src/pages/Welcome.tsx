import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { LaunchSplash } from "@/components/LaunchSplash";
import { useAuth } from "@/hooks/useAuth";

const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Signed-in users skip the launch splash entirely.
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Returning-but-signed-out users who've already been through the launch
    // splash go straight to Auth — the "Free while we're new" pitch is a
    // one-time hook, not something to shove in every session.
    const onboardingComplete = localStorage.getItem("hiit_onboarding_complete");
    if (onboardingComplete === "true") {
      navigate("/auth");
    }
  }, [navigate]);

  if (loading) {
    return <SplashScreen onComplete={() => {}} variant="orange" />;
  }

  return <LaunchSplash />;
};

export default Welcome;