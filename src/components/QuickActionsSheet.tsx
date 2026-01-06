import { 
  Heart, 
  Activity, 
  Moon, 
  Apple, 
  Dumbbell, 
  Calendar,
  Users,
  Bot,
  BookOpen,
  LogOut
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { id: "health", icon: Heart, label: "Health Metrics", color: "text-red-400" },
  { id: "activity", icon: Activity, label: "Activity", color: "text-green-400" },
  { id: "sleep", icon: Moon, label: "Sleep", color: "text-blue-400" },
  { id: "nutrition", icon: Apple, label: "Nutrition", color: "text-orange-400" },
  { id: "workouts", icon: Dumbbell, label: "Workouts", color: "text-purple-400" },
  { id: "coaching", icon: Calendar, label: "Coach Book...", color: "text-pink-400" },
  { id: "community", icon: Users, label: "Community", color: "text-cyan-400" },
  { id: "hiit-ai", icon: Bot, label: "HIIT AI", color: "text-yellow-400" },
  { id: "resources", icon: BookOpen, label: "Resources", color: "text-emerald-400" },
];

export const QuickActionsSheet = ({ open, onOpenChange }: QuickActionsSheetProps) => {
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    toast({
      title: "Signed out",
      description: "See you next workout!",
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="bg-popover max-h-[70vh]"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-popover-foreground text-center font-semibold text-base sm:text-lg">
            Quick Actions
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl sm:rounded-2xl",
                    "bg-muted/30 active:bg-muted/60 sm:hover:bg-muted/50 transition-all duration-300",
                    "sm:hover:scale-105 active:scale-95 cursor-pointer touch-manipulation",
                    "opacity-0 animate-scale-in min-h-[80px] sm:min-h-[100px]"
                  )}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
                  aria-label={action.label}
                >
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center",
                    "bg-popover-foreground/5"
                  )}>
                    <Icon size={20} className={cn(action.color, "sm:w-6 sm:h-6")} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] sm:text-xs text-popover-foreground/80 font-medium text-center leading-tight line-clamp-2">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className={cn(
              "w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl",
              "bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-300",
              "active:scale-[0.98] touch-manipulation"
            )}
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
