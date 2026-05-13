import { useNavigate, useLocation } from "react-router-dom";
import { Home, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
import hiitLogo from "@/assets/hiit-logo.webp";

interface BottomNavProps {
  onAddClick: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flags } = useFeatureFlags();
  const { unreadCount } = useCommunityNotifications();

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/" },
    // Add button — opens the full nav menu to select what to add
    { id: "add", icon: Plus, label: "Add", path: null as string | null },
    // Centre HIIT logo — opens Jarvis directly
    { id: "center", icon: null as any, label: "Jarvis", path: null as string | null },
    ...(flags.community_enabled ? [{ id: "community", icon: MessageCircle, label: "Social", path: "/community/onboarding" }] : []),
    { id: "profile", icon: User, label: "You", path: "/profile" },
  ];

  const getActiveTab = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current?.id || "home";
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.id === "add") { onAddClick(); return; }
    if (item.id === "center") {
      window.dispatchEvent(new CustomEvent("hitt:open-jarvis"));
      return;
    }
    if (!item.path) return;
    if (item.id === "community" && unreadCount > 0) {
      navigate("/community/notifications"); return;
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
    >
      <div className="w-full px-4">
        <div className="mb-1 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-elevated">
          <div className="flex items-center justify-around py-2 px-2">
            {navItems.map((item) => {
              if (item.id === "center") {
                return (
                  <button
                    key={item.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("hitt:open-jarvis"))}
                    className="relative -mt-5 transition-transform duration-200 active:scale-95 touch-manipulation"
                    aria-label="Open Jarvis"
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
                    "nav-item py-2 px-3 min-w-[52px] min-h-[48px] touch-manipulation rounded-xl relative",
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
                  {item.id === "community" && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
