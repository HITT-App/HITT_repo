import { useState } from "react";
import { Home, Bot, FileText, User } from "lucide-react";
import { HIITLogo } from "./HIITLogo";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onCenterClick: () => void;
}

const navItems = [
  { id: "home", icon: Home, label: "Home" },
  { id: "hiit-ai", icon: Bot, label: "HIIT AI" },
  { id: "center", icon: null, label: "Menu" },
  { id: "resources", icon: FileText, label: "Resources" },
  { id: "profile", icon: User, label: "Profile" },
];

export const BottomNav = ({ onCenterClick }: BottomNavProps) => {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50">
      <div className="w-full">
        <div className="mx-4 mb-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-elevated">
          <div className="flex items-center justify-around py-2 px-2">
            {navItems.map((item) => {
              if (item.id === "center") {
                return (
                  <button
                    key={item.id}
                    onClick={onCenterClick}
                    className="relative -mt-8 transition-transform duration-300 hover:scale-110 active:scale-95"
                  >
                    <HIITLogo size="lg" showGlow />
                  </button>
                );
              }

              const Icon = item.icon!;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "nav-item py-2 px-3",
                    isActive && "active"
                  )}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className="transition-all duration-300"
                  />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Home indicator bar */}
          <div className="flex justify-center pb-2">
            <div className="w-32 h-1 rounded-full bg-foreground/20" />
          </div>
        </div>
      </div>
    </nav>
  );
};
