import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bell,
  Dumbbell,
  UtensilsCrossed,
  UserCheck,
  Trophy,
  MessageSquare,
  BarChart3,
  Settings,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Workouts", href: "/admin/workouts", icon: Dumbbell },
  { title: "Meals", href: "/admin/meals", icon: UtensilsCrossed },
  { title: "Coaches", href: "/admin/coaches", icon: UserCheck },
  { title: "Badges", href: "/admin/badges", icon: Trophy },
  { title: "Community", href: "/admin/community", icon: MessageSquare },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Button>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

export function AdminMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="md:hidden overflow-x-auto border-b bg-card">
      <div className="flex p-2 gap-1 min-w-max">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate(item.href)}
              className="shrink-0 gap-1.5"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.title}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
