import { useState } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { FullNavMenu } from "@/components/FullNavMenu";
import { useAuth } from "@/hooks/useAuth";

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
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  const shouldHideNav = !user || HIDDEN_NAV_ROUTES.some(
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
          <BottomNav onCenterClick={() => setNavMenuOpen(true)} />
          <FullNavMenu open={navMenuOpen} onOpenChange={setNavMenuOpen} />
        </>
      )}
    </>
  );
}
