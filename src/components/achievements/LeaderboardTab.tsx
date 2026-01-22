import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { 
  useLeaderboard, 
  useUserRanking, 
  useRealtimeLeaderboard,
  useAchievementActions 
} from "@/hooks/useAchievements";

const rankColors: Record<number, string> = {
  1: "bg-primary",
  2: "bg-primary/80",
  3: "bg-primary/60",
  4: "bg-purple-400",
  5: "bg-green-400",
};

const LeaderboardTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [subTab, setSubTab] = useState<"gym" | "worldwide" | "friends">("worldwide");
  
  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useLeaderboard(subTab);
  const { data: userRanking } = useUserRanking(subTab);
  const { initializeLeaderboard } = useAchievementActions();
  
  // Subscribe to real-time updates
  useRealtimeLeaderboard(subTab);

  // Initialize user on leaderboard if not present
  useEffect(() => {
    if (user?.id && !userRanking && !isLoading) {
      initializeLeaderboard.mutate(subTab);
    }
  }, [user?.id, userRanking, isLoading, subTab]);

  const userPoints = userRanking?.total_points || 0;
  const userRank = userRanking?.rank_position || '-';

  return (
    <div className="pt-4">
      {/* Sub-tabs: Gym, Worldwide, Friends */}
      <div className="px-4 mb-6">
        <div className="flex justify-center gap-6">
          {(["Gym", "Worldwide", "Friends"] as const).map((tab) => (
            <button
              key={tab}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                subTab === tab.toLowerCase()
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
              onClick={() => setSubTab(tab.toLowerCase() as "gym" | "worldwide" | "friends")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 mb-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
              ◀
            </Button>
            <Avatar className="w-20 h-20 border-4 border-primary">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {profile?.display_name?.substring(0, 2).toUpperCase() || 
                 user?.email?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full bg-muted/50"
              onClick={() => navigate("/profile")}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-4xl font-bold text-foreground mb-2">{userPoints.toLocaleString()}pts</p>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-primary">❤️</span> Fitness Enthusiast
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-primary">🏆</span> #{userRank} ranked
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">
            {subTab === "gym" ? "Gym" : subTab === "worldwide" ? "Global" : "Friends"} Leaderboard
          </h3>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/leaderboard")}
          >
            See All
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((player) => (
              <Card 
                key={player.id}
                className={`p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow ${
                  player.user_id === user?.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={player.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {player.profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">
                    {player.profile?.display_name || "Anonymous User"}
                    {player.user_id === user?.id && (
                      <span className="text-primary ml-1">(You)</span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Ranked #{player.rank_position} • {player.total_points.toLocaleString()}pts
                  </p>
                </div>
                
                <div className={`w-10 h-10 rounded-xl ${rankColors[player.rank_position || 99] || "bg-muted"} flex items-center justify-center text-lg`}>
                  {player.rank_position && player.rank_position <= 3 ? (
                    <span>{["🥇", "🥈", "🥉"][player.rank_position - 1]}</span>
                  ) : (
                    <span className="text-white font-bold text-sm">{player.rank_position}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground mb-2">No rankings yet</p>
            <p className="text-sm text-muted-foreground">
              Complete workouts and activities to earn points!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LeaderboardTab;
