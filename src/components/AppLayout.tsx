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
  "/hydration",
  "/meal-scanner",
  // Per-activity share composer — the Share/Post buttons sit at the
  // bottom of the sheet and were clipped by the nav bar. Trailing slash
  // ensures we only match /activity/:id, NOT /activity-live,
  // /activity-history, /activity-dashboard or /activity-onboarding.
  "/activity/",
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [hiitMenuOpen, setHiitMenuOpen] = useState(false);

  const { navHidden } = useNavVisibility();
  // Full-screen routes need no padding and no nav bar
  const isFullScreenRoute = !user || HIDDEN_NAV_ROUTES.some(
    (route) => location.pathname.startsWith(route)
  );
  // Modal overlays (navHidden) keep the padding to avoid layout shift — just hide the bar
  const shouldHideNav = isFullScreenRoute || navHidden;

  return (
    <>
      {isFullScreenRoute ? (
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
