import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bot, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
import hiitLogo from "@/assets/hiit-logo.webp";

interface BottomNavProps {
  onCenterClick: () => void;
}

export const BottomNav = ({ onCenterClick }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flags } = useFeatureFlags();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    ...(flags.ai_coach_enabled ? [{ id: "hiit-ai", icon: Bot, label: "AI", path: "/ai-coach" }] : []),
    { id: "center", icon: null as any, label: "Menu", path: null as string | null },
    ...(flags.community_enabled ? [{ id: "community", icon: MessageCircle, label: "Social", path: "/community" }] : []),
    { id: "profile", icon: User, label: "You", path: "/profile" },
  ];

  const getActiveTab = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current?.id || "home";
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
    >
      <div className="w-full px-4">
        <div className="mb-3 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-elevated">
          <div className="flex items-center justify-around py-2 px-2">
            {navItems.map((item) => {
              if (item.id === "center") {
                return (
                  <button
                    key={item.id}
                    onClick={onCenterClick}
                    className="relative -mt-5 transition-transform duration-200 active:scale-95 touch-manipulation"
                    aria-label="Open quick actions menu"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-primary shadow-card overflow-hidden bg-white">
                      <img src={hiitLogo} alt="HIIT" className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              }

              const Icon = item.icon!;
              const isActive = getActiveTab() === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "nav-item py-2 px-3 min-w-[52px] min-h-[48px] touch-manipulation rounded-xl",
                    isActive && "active"
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2 : 1.5}
                    className="transition-all duration-200"
                  />
                  <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
