import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Home, Activity, Moon, Apple, Calendar, Bot,
  LogOut, User, Trophy, Target, MessageCircle,
  Bell, Search, Settings, Footprints, Droplets,
  Scale, Gauge, Smile, Camera, UtensilsCrossed,
  Clock, X, Crown, Shield, Sun, ScanLine, Crosshair,
  Barcode,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

type HIITMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HIITMenu({ open, onOpenChange }: HIITMenuProps) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminRole();
  const { flags } = useFeatureFlags();
  const { toast: uiToast } = useToast();
  const { theme, setTheme } = useTheme();

  // TODO Task 3: wire this to open ChooseSportSheet
  const handleChooseSport = () => {
    onOpenChange(false);
    toast.info("Sport picker coming next");
  };

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    uiToast({ title: "Signed out", description: "See you next workout!" });
  };

  const menuSections = [
    {
      title: "Main",
      items: [
        { icon: Home, label: "Home", path: "/" },
        ...(flags.ai_coach_enabled ? [{ icon: Bot, label: "HIIT AI Coach", path: "/ai-coach" }] : []),
        { icon: Search, label: "Search", path: "/search" },
        { icon: Bell, label: "Notifications", path: "/notifications" },
      ],
    },
    {
      title: "Fitness",
      items: [
        { icon: Calendar, label: "Schedule", path: "/workout-schedule" },
        ...(flags.activity_enabled ? [
          { icon: Activity, label: "Activity", path: "/activity-dashboard" },
          { icon: Target, label: "Goals", path: "/activity-goals" },
          { icon: Clock, label: "History", path: "/activity-history" },
        ] : []),
      ],
    },
    ...(flags.nutrition_enabled ? [{
      title: "Nutrition",
      items: [
        { icon: Apple, label: "Nutrition", path: "/nutrition" },
        { icon: UtensilsCrossed, label: "Meals", path: "/browse-meals" },
      ],
    }] : []),
    {
      title: "Scanners",
      items: [
        ...(flags.food_scanner_enabled ? [{ icon: Camera, label: "Meal Scanner", path: "/meal-scanner" }] : []),
        { icon: ScanLine, label: "Body Scanner", path: "/body-scan" },
        ...(flags.food_scanner_enabled ? [{ icon: Barcode, label: "Barcode Scanner", path: "/barcode-scanner" }] : []),
      ],
    },
    ...(flags.health_metrics_enabled ? [{
      title: "Health",
      items: [
        { icon: Gauge, label: "Heart Rate", path: "/heart-rate" },
        { icon: Footprints, label: "Steps", path: "/steps" },
        { icon: Scale, label: "Weight", path: "/weight" },
        { icon: Droplets, label: "Hydration", path: "/hydration" },
        ...(flags.sleep_enabled ? [{ icon: Moon, label: "Sleep", path: "/sleep" }] : []),
        { icon: Smile, label: "Mood", path: "/mood" },
      ],
    }] : []),
    ...(flags.community_enabled ? [{
      title: "Community",
      items: [
        { icon: MessageCircle, label: "Community", path: "/community" },
        ...(flags.achievements_enabled ? [{ icon: Trophy, label: "Achievements", path: "/achievements" }] : []),
        ...(flags.leaderboard_enabled ? [{ icon: Trophy, label: "Leaderboard", path: "/leaderboard" }] : []),
      ],
    }] : []),
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", path: "/profile" },
        { icon: Crown, label: "Subscription", path: "/subscription" },
        // TODO: no dedicated /settings route — /profile is used as fallback (matches original)
        { icon: Settings, label: "Settings", path: "/chat-settings" },
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* [&>button]:hidden suppresses SheetContent's default close button; we render our own */}
      <SheetContent
        side="bottom"
        className="h-[90vh] p-0 flex flex-col [&>button]:hidden"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        {/* Header: avatar + name + email + theme toggle + close */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-11 h-11 border border-border">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
              <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                {profile?.display_name?.slice(0, 2).toUpperCase() ||
                  user?.email?.slice(0, 2).toUpperCase() ||
                  'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-foreground font-semibold text-base leading-tight">
                {profile?.display_name || 'Welcome'}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <Sun size={20} className="text-muted-foreground" />
                : <Moon size={20} className="text-muted-foreground" />}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-secondary transition-colors"
              aria-label="Close menu"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-5 space-y-6">

            {/* Choose a Sport — primary branded action */}
            {/* TODO Task 3: replace handler with ChooseSportSheet open */}
            <button
              onClick={handleChooseSport}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-2xl",
                "bg-primary/10 border border-primary/30 active:bg-primary/20 transition-colors",
                "touch-manipulation"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Crosshair size={22} className="text-primary" />
              </div>
              <div className="text-left">
                <span className="font-semibold text-foreground text-[15px]">Choose a Sport</span>
                <p className="text-xs text-muted-foreground">Start tracking an activity</p>
              </div>
            </button>

            {/* Admin section — admin users only */}
            {isAdmin && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                  Admin
                </h3>
                <button
                  onClick={() => go('/admin')}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-xl",
                    "bg-primary/5 active:bg-primary/10 transition-colors",
                    "touch-manipulation"
                  )}
                >
                  <Shield size={20} className="text-primary" />
                  <span className="font-medium text-foreground">Admin Dashboard</span>
                </button>
              </div>
            )}

            {/* Menu sections */}
            {menuSections.map((section) =>
              section.items.length === 0 ? null : (
                <div key={section.title} className="space-y-1.5">
                  <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => go(item.path)}
                          className={cn(
                            "w-full flex items-center gap-3 py-3 px-3 rounded-xl",
                            "active:bg-secondary transition-colors",
                            "touch-manipulation"
                          )}
                        >
                          <Icon size={20} className="text-muted-foreground" strokeWidth={1.5} />
                          <span className="font-medium text-foreground text-[15px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}

            {/* Sign Out */}
            <div className="pt-4 border-t border-border/40">
              <button
                onClick={handleSignOut}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl",
                  "text-destructive active:bg-destructive/10 transition-colors",
                  "touch-manipulation"
                )}
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>

            <div className="h-8" />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
