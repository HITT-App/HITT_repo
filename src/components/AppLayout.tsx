import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { HIITMenu } from "@/components/HIITMenu";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { useAuth } from "@/hooks/useAuth";
import { useNavVisibility } from "@/contexts/NavVisibilityContext";

// Pages where the bottom nav should be hidden (full-screen experiences)
const HIDDEN_NAV_ROUTES = [
  "/activity-live",
  "/gym-timer",
  "/sleeping",
  "/workout-player",
  "/live-session",
  "/welcome",
  "/auth",
  "/assessment",
  "/onboarding",
  "/community/chatroom",
  "/community/post",
  "/community/story",
  "/community/create-story",
  "/routes",
  "/route/",
  "/ai-coach",
  "/ai",
  "/goal-setup",
  "/schedule-setup",
  "/sleep-onboarding",
  "/log-meal",
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [hiitMenuOpen, setHiitMenuOpen] = useState(false);

  const { navHidden } = useNavVisibility();
  const shouldHideNav = !user || navHidden || HIDDEN_NAV_ROUTES.some(
    (route) => location.pathname.startsWith(route)
  );

  return (
    <>
      {shouldHideNav ? (
        children
      ) : (
        <div className="pb-24">
          {children}
        </div>
      )}
      {!shouldHideNav && (
        <>
          <BottomNav onHIITClick={() => setHiitMenuOpen(true)} onQuickAddClick={() => setQuickAddOpen(prev => !prev)} quickAddOpen={quickAddOpen} />
          <FloatingActionButton onClick={() => navigate('/ai')} />
          <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
          <HIITMenu open={hiitMenuOpen} onOpenChange={setHiitMenuOpen} />
        </>
      )}
    </>
  );
}
