import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // First-time users (never completed onboarding) see the LaunchSplash
    // at /welcome — the "free while we're new" pitch is one-shot. Returning
    // signed-out users skip straight to /auth. The flag is set by
    // LaunchSplash.tsx and OnboardingScreen.tsx when either finishes.
    const seenOnboarding = typeof window !== "undefined"
      && localStorage.getItem("hiit_onboarding_complete") === "true";
    return <Navigate to={seenOnboarding ? "/auth" : "/welcome"} replace />;
  }

  return <>{children}</>;
};
