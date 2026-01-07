import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { useAuth } from "@/hooks/useAuth";

const Welcome = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to home
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Check if onboarding was already completed
    const onboardingComplete = localStorage.getItem("hiit_onboarding_complete");
    if (onboardingComplete === "true") {
      navigate("/auth");
    }
  }, [navigate]);

  if (loading) {
    return <SplashScreen onComplete={() => {}} variant="orange" />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} variant="orange" />;
  }

  return <OnboardingScreen />;
};

export default Welcome;