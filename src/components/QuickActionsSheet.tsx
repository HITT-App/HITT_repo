import { 
  Heart, 
  Activity, 
  Moon, 
  Apple, 
  Dumbbell, 
  Calendar,
  Users,
  Bot,
  BookOpen
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

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
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-popover max-h-[60vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-popover-foreground text-center font-semibold">
            Quick Actions
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8">
          <div className="grid grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl",
                    "bg-muted/30 hover:bg-muted/50 transition-all duration-300",
                    "hover:scale-105 active:scale-95 cursor-pointer",
                    "opacity-0 animate-scale-in"
                  )}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    "bg-popover-foreground/5"
                  )}>
                    <Icon size={24} className={action.color} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-popover-foreground/80 font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
