import { Search, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HIITScoreBadge } from "./HIITScoreBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import hiitLogo from "@/assets/hiit-logo.jpg";

interface HIITScoreComponents {
  workouts: number;
  streak: number;
  nutrition: number;
  sleep: number;
  intensity: number;
  inputs?: {
    workoutCount: number;
    streakDays: number;
    nutritionDaysHit: number;
    sleepDaysGood: number;
    avgDurationMinutes: number;
  };
}

interface HomeHeaderProps {
  userName?: string;
  score?: number;
  scoreComponents?: HIITScoreComponents | null;
  avatarUrl?: string | null;
}

export function HomeHeader({ userName = "Athlete", score, scoreComponents, avatarUrl }: HomeHeaderProps) {
  const navigate = useNavigate();

  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Welcome back";
  };

  return (
    <div className="bg-background px-4 pt-2 pb-3 space-y-4">
      {/* Top Row: Logo + Greeting + Notifications */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="rounded-xl active:opacity-70 transition-opacity"
            aria-label="Go to profile"
          >
            <Avatar className="w-10 h-10 rounded-xl">
              <AvatarImage src={avatarUrl || undefined} alt={userName} className="rounded-xl" />
              <AvatarFallback className="rounded-xl">
                <img src={hiitLogo} alt="HIIT Logo" className="w-full h-full object-cover" />
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/notifications")}
          className="relative rounded-full"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {/* Notification dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
      </div>

      {/* HIIT Score Badge */}
      <div className="bg-card border border-border/60 rounded-xl p-3">
        <HIITScoreBadge score={score} components={scoreComponents} label="Average Fitness" />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search HIIT..."
          className="pl-10 bg-secondary border-0 rounded-xl h-11"
          onClick={() => navigate("/search")}
          readOnly
        />
      </div>
    </div>
  );
}
