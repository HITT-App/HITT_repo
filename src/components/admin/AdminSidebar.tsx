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
  PanelTop,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

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
  { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { title: "Layout", href: "/admin/layout", icon: PanelTop },
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
  const [open, setOpen] = useState(false);

  const currentPage = navItems.find((item) => item.href === location.pathname);
  const CurrentIcon = currentPage?.icon || LayoutDashboard;

  return (
    <div className="md:hidden">
      {/* Compact mobile header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{currentPage?.title || "Admin"}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Dropdown nav grid */}
      {open && (
        <div className="border-b bg-card/95 backdrop-blur-sm px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-4 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-center transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
