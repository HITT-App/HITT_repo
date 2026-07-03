import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HIITScoreBadge } from "./HIITScoreBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
const PRESET_COUNT = 12;

const presetAvatar = (seed: string | null | undefined) => {
  const s = seed || '';
  const idx = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PRESET_COUNT;
  return `/avatars/avatar-${String(idx + 1).padStart(2, '0')}.jpg`;
};

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
  const { unreadCount } = useCommunityNotifications();

  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Welcome back";
  };

  return (
    <div className="bg-background px-5 pt-2 pb-3 space-y-4">
      {/* Top Row: Logo + Greeting + Notifications */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="rounded-xl active:opacity-70 transition-opacity"
            aria-label="Go to profile"
            data-tutorial="avatar"
          >
            <Avatar className="w-11 h-11 rounded-xl">
              <AvatarImage src={avatarUrl || presetAvatar(userName)} alt={userName} className="rounded-xl object-cover" />
              <AvatarFallback className="rounded-xl" />
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
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </div>

      {/* HIIT Score Badge */}
      <div className="bg-card border border-border/60 rounded-xl p-3">
        <HIITScoreBadge score={score} components={scoreComponents} label="Average Fitness" />
      </div>
    </div>
  );
}
