import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { 
  Home,
  Heart, 
  Activity, 
  Moon, 
  Apple, 
  Dumbbell, 
  Calendar,
  Users,
  Bot,
  BookOpen,
  LogOut,
  User,
  Trophy,
  Target,
  MessageCircle,
  Bell,
  Search,
  Settings,
  Footprints,
  Droplets,
  Scale,
  Gauge,
  Smile,
  Camera,
  UtensilsCrossed,
  PlayCircle,
  Clock,
  GraduationCap,
  Video,
  X,
  Crown,
  Shield,
  Sun,
  ScanLine
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FullNavMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FullNavMenu = ({ open, onOpenChange }: FullNavMenuProps) => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminRole();
  const { flags } = useFeatureFlags();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const menuSections = [
    {
      title: "Main",
      items: [
        { icon: Home, label: "Home", path: "/" },
        ...(flags.ai_coach_enabled ? [{ icon: Bot, label: "HIIT AI Coach", path: "/ai-coach" }] : []),
        { icon: Search, label: "Search", path: "/search" },
        { icon: Bell, label: "Notifications", path: "/notifications" },
      ]
    },
    ...(flags.workouts_enabled ? [{
      title: "Fitness",
      items: [
        { icon: Dumbbell, label: "Workouts", path: "/workouts" },
        { icon: PlayCircle, label: "Workout Library", path: "/workout-library" },
        { icon: Calendar, label: "Schedule", path: "/workout-schedule" },
        ...(flags.activity_enabled ? [
          { icon: Activity, label: "Activity", path: "/activity" },
          { icon: Target, label: "Goals", path: "/activity-goals" },
          { icon: Clock, label: "History", path: "/activity-history" },
        ] : []),
      ]
    }] : []),
    ...(flags.nutrition_enabled ? [{
      title: "Nutrition",
      items: [
        { icon: Apple, label: "Nutrition", path: "/nutrition" },
        { icon: UtensilsCrossed, label: "Meals", path: "/browse-meals" },
        ...(flags.food_scanner_enabled ? [{ icon: Camera, label: "Scanner", path: "/meal-scanner" }] : []),
      ]
    }] : []),
    ...(flags.health_metrics_enabled ? [{
      title: "Health",
      items: [
        { icon: Heart, label: "Metrics", path: "/health-metrics" },
        { icon: Gauge, label: "Heart Rate", path: "/heart-rate" },
        { icon: Footprints, label: "Steps", path: "/steps" },
        { icon: Scale, label: "Weight", path: "/weight" },
        { icon: Droplets, label: "Hydration", path: "/hydration" },
        { icon: ScanLine, label: "Body Scan", path: "/body-scan" },
        ...(flags.sleep_enabled ? [{ icon: Moon, label: "Sleep", path: "/sleep" }] : []),
        { icon: Smile, label: "Mood", path: "/mood" },
      ]
    }] : []),
    ...(flags.coaching_enabled ? [{
      title: "Coaching",
      items: [
        { icon: Users, label: "Find a Coach", path: "/browse-coaches" },
        { icon: Calendar, label: "Sessions", path: "/coach-appointments" },
      ]
    }] : []),
    ...(flags.community_enabled ? [{
      title: "Community",
      items: [
        { icon: MessageCircle, label: "Community", path: "/community" },
        ...(flags.achievements_enabled ? [{ icon: Trophy, label: "Achievements", path: "/achievements" }] : []),
        ...(flags.challenges_enabled ? [{ icon: Target, label: "Challenges", path: "/challenges" }] : []),
        ...(flags.leaderboard_enabled ? [{ icon: Trophy, label: "Leaderboard", path: "/achievements" }] : []),
      ]
    }] : []),
    ...(flags.resources_enabled ? [{
      title: "Resources",
      items: [
        { icon: BookOpen, label: "Resources", path: "/resources" },
        { icon: GraduationCap, label: "Courses", path: "/resources" },
        { icon: Video, label: "Shorts", path: "/resources" },
      ]
    }] : []),
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", path: "/profile" },
        { icon: Crown, label: "Subscription", path: "/subscription" },
        { icon: Settings, label: "Settings", path: "/profile" },
      ]
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    toast({
      title: "Signed out",
      description: "See you next workout!",
    });
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="bg-background h-[85vh] max-h-[85vh]"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        <DrawerHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11 border border-border">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                  {profile?.display_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <DrawerTitle className="text-foreground font-semibold text-base">
                  {profile?.display_name || 'Welcome'}
                </DrawerTitle>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} className="text-muted-foreground" /> : <Moon size={20} className="text-muted-foreground" />}
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
        </DrawerHeader>
        
        <ScrollArea className="flex-1 h-full">
          <div className="px-4 py-5 space-y-6">
            {/* Admin Section */}
            {isAdmin && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                  Admin
                </h3>
                <button
                  onClick={() => handleNavClick('/admin')}
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

            {/* Menu Sections */}
            {menuSections.map((section) => (
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
                        onClick={() => handleNavClick(item.path)}
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
            ))}

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
      </DrawerContent>
    </Drawer>
  );
};
