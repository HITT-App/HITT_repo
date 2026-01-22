import { useNavigate, useLocation } from "react-router-dom";
import { Home, Bot, FileText, User } from "lucide-react";
import { HIITLogo } from "./HIITLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface BottomNavProps {
  onCenterClick: () => void;
}

const navItems = [
  { id: "home", icon: Home, label: "Home", path: "/" },
  { id: "hiit-ai", icon: Bot, label: "HIIT AI", path: "/ai-coach" },
  { id: "center", icon: null, label: "Menu", path: null },
  { id: "resources", icon: FileText, label: "Resources", path: "/resources" },
  { id: "profile", icon: User, label: "Profile", path: "/profile" },
];

export const BottomNav = ({ onCenterClick }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();

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
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
    >
      <div className="w-full px-3 sm:px-4">
        <div className="mb-2 sm:mb-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-elevated">
          <div className="flex items-center justify-around py-2 sm:py-3 px-1 sm:px-2">
            {navItems.map((item) => {
              if (item.id === "center") {
                return (
                  <button
                    key={item.id}
                    onClick={onCenterClick}
                    className="relative -mt-6 sm:-mt-8 transition-transform duration-300 hover:scale-110 active:scale-95 touch-manipulation"
                    aria-label="Open quick actions menu"
                  >
                    {profile?.avatar_url ? (
                      <Avatar className="w-16 h-16 border-2 border-primary pulse-glow">
                        <AvatarImage src={profile.avatar_url} alt="Profile" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile.display_name?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <HIITLogo size="lg" showGlow />
                    )}
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
                    "nav-item py-2 px-2 sm:px-3 min-w-[44px] min-h-[44px] touch-manipulation",
                    isActive && "active"
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className="transition-all duration-300 sm:w-[22px] sm:h-[22px]"
                  />
                  <span className="text-[9px] sm:text-[10px] font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Home indicator bar */}
          <div className="flex justify-center pb-1.5 sm:pb-2">
            <div className="w-28 sm:w-32 h-1 rounded-full bg-foreground/20" />
          </div>
        </div>
      </div>
    </nav>
  );
};
