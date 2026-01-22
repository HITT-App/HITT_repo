import { useNavigate } from "react-router-dom";
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
  Sparkles,
  ChevronRight,
  X,
  Crown,
  Shield
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
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FullNavMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuSections = [
  {
    title: "Main",
    items: [
      { icon: Home, label: "Home", path: "/", color: "text-primary" },
      { icon: Bot, label: "HIIT AI Coach", path: "/ai-coach", color: "text-yellow-500" },
      { icon: Search, label: "Search", path: "/search", color: "text-muted-foreground" },
      { icon: Bell, label: "Notifications", path: "/notifications", color: "text-blue-500" },
    ]
  },
  {
    title: "Fitness",
    items: [
      { icon: Dumbbell, label: "Workouts", path: "/workouts", color: "text-purple-500" },
      { icon: PlayCircle, label: "Workout Library", path: "/workout-library", color: "text-purple-400" },
      { icon: Calendar, label: "Workout Schedule", path: "/workout-schedule", color: "text-purple-300" },
      { icon: Activity, label: "Activity Tracker", path: "/activity", color: "text-green-500" },
      { icon: Target, label: "Activity Goals", path: "/activity-goals", color: "text-green-400" },
      { icon: Clock, label: "Activity History", path: "/activity-history", color: "text-green-300" },
    ]
  },
  {
    title: "Nutrition",
    items: [
      { icon: Apple, label: "Nutrition", path: "/nutrition", color: "text-orange-500" },
      { icon: UtensilsCrossed, label: "Browse Meals", path: "/browse-meals", color: "text-orange-400" },
      { icon: Camera, label: "Meal Scanner", path: "/meal-scanner", color: "text-orange-300" },
    ]
  },
  {
    title: "Health & Wellness",
    items: [
      { icon: Heart, label: "Health Metrics", path: "/health-metrics", color: "text-red-500" },
      { icon: Gauge, label: "Heart Rate", path: "/heart-rate", color: "text-red-400" },
      { icon: Footprints, label: "Steps", path: "/steps", color: "text-emerald-500" },
      { icon: Scale, label: "Weight", path: "/weight", color: "text-blue-500" },
      { icon: Droplets, label: "Hydration", path: "/hydration", color: "text-cyan-500" },
      { icon: Moon, label: "Sleep Tracker", path: "/sleep", color: "text-indigo-500" },
      { icon: Smile, label: "Mood", path: "/mood", color: "text-amber-500" },
    ]
  },
  {
    title: "Coaching",
    items: [
      { icon: Users, label: "Find a Coach", path: "/browse-coaches", color: "text-pink-500" },
      { icon: Calendar, label: "My Sessions", path: "/coach-appointments", color: "text-pink-400" },
    ]
  },
  {
    title: "Community",
    items: [
      { icon: MessageCircle, label: "Community", path: "/community", color: "text-violet-500" },
      { icon: Trophy, label: "Achievements", path: "/achievements", color: "text-amber-500" },
      { icon: Target, label: "Challenges", path: "/challenges", color: "text-rose-500" },
    ]
  },
  {
    title: "Resources",
    items: [
      { icon: BookOpen, label: "Resources Hub", path: "/resources", color: "text-emerald-500" },
      { icon: GraduationCap, label: "Courses", path: "/resources", color: "text-emerald-400" },
      { icon: Video, label: "Shorts", path: "/resources", color: "text-emerald-300" },
    ]
  },
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", path: "/profile", color: "text-muted-foreground" },
      { icon: Crown, label: "Subscription", path: "/subscription", color: "text-amber-500" },
      { icon: Settings, label: "Settings", path: "/profile", color: "text-muted-foreground" },
    ]
  },
];

export const FullNavMenu = ({ open, onOpenChange }: FullNavMenuProps) => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminRole();
  const { toast } = useToast();

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
        className="bg-background h-[90vh] max-h-[90vh]"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        <DrawerHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profile?.display_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <DrawerTitle className="text-foreground font-semibold">
                  {profile?.display_name || 'Welcome'}
                </DrawerTitle>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </DrawerHeader>
        
        <ScrollArea className="flex-1 h-full">
          <div className="px-4 py-4 space-y-6">
            {/* Admin Section - Only for admins */}
            {isAdmin && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  Admin
                </h3>
                <button
                  onClick={() => handleNavClick('/admin')}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl",
                    "bg-primary/10 hover:bg-primary/20 transition-all duration-200",
                    "active:scale-[0.98] touch-manipulation"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Shield size={18} className="text-primary" />
                    </div>
                    <span className="font-medium text-foreground">Admin Dashboard</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Menu Sections */}
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleNavClick(item.path)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl",
                          "hover:bg-muted/50 transition-all duration-200",
                          "active:scale-[0.98] touch-manipulation"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center"
                          )}>
                            <Icon size={18} className={item.color} />
                          </div>
                          <span className="font-medium text-foreground">{item.label}</span>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Sign Out */}
            <div className="pt-4 border-t border-border/50">
              <button
                onClick={handleSignOut}
                className={cn(
                  "w-full flex items-center justify-center gap-2 p-3 rounded-xl",
                  "bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-300",
                  "active:scale-[0.98] touch-manipulation"
                )}
              >
                <LogOut size={18} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>

            {/* Bottom spacing for safe area */}
            <div className="h-8" />
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
