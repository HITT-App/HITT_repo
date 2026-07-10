import { useNavigate, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
import hiitLogo from "@/assets/hiit-logo.webp";
import { HEmoji } from "@/components/HEmoji";

interface BottomNavProps {
  onHIITClick?: () => void;
  onQuickAddClick?: () => void;
  quickAddOpen?: boolean;
}

export const BottomNav = ({ onHIITClick, onQuickAddClick, quickAddOpen }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { flags } = useFeatureFlags();
  const { unreadCount } = useCommunityNotifications();

  const navItems = [
    { id: "home",      label: "Home",      path: "/" },
    { id: "quickadd",  label: "Quick Add", path: null as string | null },
    { id: "center",    label: "Coach",     path: null as string | null },
    { id: "schedule",  label: "Schedule",  path: "/workout-schedule" },
    ...(flags.community_enabled ? [{ id: "community", label: "Social", path: "/community/feed" }] : []),
  ];

  const getActiveTab = () => {
    const current = navItems.find(item => item.path === location.pathname);
    return current?.id || "home";
  };

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.id === "quickadd") {
      onQuickAddClick?.();
      return;
    }
    if (item.id === "center") return;
    if (!item.path) return;
    // Social tab now always routes to the feed. The unread badge is
    // informational; the bell icon on the feed header opens the
    // notifications inbox. Previously we hijacked the tap and
    // redirected to notifications on unread, which trapped users
    // out of reaching the feed until they cleared every notification.
    navigate(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
      style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      data-tutorial="nav"
    >
      <div className="w-full px-4">
        <div className="mb-1 rounded-2xl bg-background/95 backdrop-blur-md border border-border/40 shadow-elevated">
          <div className="flex items-center justify-around py-2 px-2">
            {navItems.map((item) => {
              if (item.id === "center") {
                return (
                  <button
                    key={item.id}
                    onClick={() => onHIITClick?.()}
                    className="relative -mt-5 transition-transform duration-200 active:scale-95 touch-manipulation"
                    aria-label="Open HIIT menu"
                    data-tutorial="hiit-logo"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-primary shadow-card overflow-hidden bg-white">
                      <img src={hiitLogo} alt="HIIT" className="w-full h-full object-cover" />
                    </div>
                  </button>
                );
              }

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
                  {item.id === 'home'
                    ? <Home size={22} strokeWidth={isActive ? 2 : 1.5} className="transition-all duration-200" />
                    : item.id === 'quickadd'
                    ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                        style={{
                          transform: quickAddOpen ? "rotate(45deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          transformBox: "fill-box",
                          transformOrigin: "center",
                        } as React.CSSProperties}
                      >
                        <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="6.2" stroke="currentColor" strokeWidth="1.7" opacity="0.5" />
                        <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
                      </svg>
                    )
                    : item.id === 'schedule'
                    ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="transition-all duration-200">
                        <rect x="3" y="5" width="18" height="16" rx="4.2" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} />
                        <path d="M8 2.6V6M16 2.6V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M3 9.6H21" stroke="currentColor" strokeWidth="1.6" />
                        <circle cx="8" cy="13.6" r="1.25" fill="currentColor" />
                        <circle cx="12" cy="13.6" r="1.25" fill="currentColor" />
                        <circle cx="16" cy="13.6" r="1.25" fill="currentColor" />
                        <circle cx="8" cy="17.4" r="1.25" fill="currentColor" />
                        <circle cx="12" cy="17.4" r="1.25" fill="currentColor" />
                      </svg>
                    )
                    : item.id === 'community'
                    ? <HEmoji name="social" size={22} />
                    : null}
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
