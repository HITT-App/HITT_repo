import { useState } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ChooseSportSheet } from "@/components/ChooseSportSheet";
import { useAuth } from "@/hooks/useAuth";

// Pages where the bottom nav should be hidden (full-screen experiences)
const HIDDEN_NAV_ROUTES = [
  "/activity-live",
  "/sleeping",
  "/workout-player",
  "/live-session",
  "/welcome",
  "/auth",
  "/assessment",
  "/onboarding",
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [sportSheetOpen, setSportSheetOpen] = useState(false);

  const shouldHideNav = !user || HIDDEN_NAV_ROUTES.some(
    (route) => location.pathname.startsWith(route)
  );

  return (
    <>
      {children}
      {!shouldHideNav && (
        <>
          <BottomNav onCenterClick={() => setSportSheetOpen(true)} />
          <ChooseSportSheet open={sportSheetOpen} onOpenChange={setSportSheetOpen} />
        </>
      )}
    </>
  );
}
