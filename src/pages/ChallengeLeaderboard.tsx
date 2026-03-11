import { useState, useEffect, useRef } from "react";
import { ArrowLeft, RefreshCw, Medal, Trophy, Crown, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLeaderboard,
  useFriendsLeaderboard,
  useUserRanking,
  useRealtimeLeaderboard,
  useAchievementActions,
  type LeaderboardEntry,
} from "@/hooks/useAchievements";

type SortKey = "total_points" | "weekly_points" | "monthly_points";
type TimePeriod = { label: string; key: SortKey };

const TIME_PERIODS: TimePeriod[] = [
  { label: "All Time", key: "total_points" },
  { label: "Monthly", key: "monthly_points" },
  { label: "Weekly", key: "weekly_points" },
];

const ChallengeLeaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<SortKey>("total_points");
  const [activeTab, setActiveTab] = useState("all");
  const myRowRef = useRef<HTMLDivElement>(null);
  const [showJumpBtn, setShowJumpBtn] = useState(false);

  const { data: allLeaderboard, isLoading: allLoading } = useLeaderboard("worldwide", sortBy);
  const { data: friendsLeaderboard, isLoading: friendsLoading } = useFriendsLeaderboard(sortBy);
  const { data: userRanking } = useUserRanking("worldwide");
  const { initializeLeaderboard } = useAchievementActions();

  useRealtimeLeaderboard("worldwide");

  // Auto-initialize
  useEffect(() => {
    if (user?.id && !userRanking && !allLoading) {
      initializeLeaderboard.mutate("worldwide");
    }
  }, [user?.id, userRanking, allLoading]);

  // Show jump button when user row is not visible
  useEffect(() => {
    if (!myRowRef.current || !user?.id) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowJumpBtn(!entry.isIntersecting),
      { threshold: 0.5 }
    );
    observer.observe(myRowRef.current);
    return () => observer.disconnect();
  }, [allLeaderboard, user?.id, activeTab]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["friends-leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["user-ranking"] });
  };

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const getPointsValue = (entry: any): number => entry[sortBy] || 0;

  const currentData = activeTab === "all" ? allLeaderboard : friendsLeaderboard;
  const isLoading = activeTab === "all" ? allLoading : friendsLoading;
  const top3 = currentData?.slice(0, 3) || [];
  const rest = currentData?.slice(3) || [];
  const myRank = userRanking?.rank_position || (currentData?.findIndex(e => e.user_id === user?.id) ?? -1) + 1;
  const myPoints = userRanking?.total_points || 0;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Leaderboard</h1>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </header>

      <div className="px-4 space-y-4 mt-2">
        {/* Your Place */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Your Place</span>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">
                {myRank ? `Ranked #${myRank}` : "Unranked"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{profile?.display_name || "You"}</p>
              <p className="text-2xl font-bold text-primary">{myPoints.toLocaleString()} pts</p>
            </div>
          </div>
        </Card>

        {/* Time period filter */}
        <div className="flex gap-2">
          {TIME_PERIODS.map((tp) => (
            <Button
              key={tp.key}
              variant={sortBy === tp.key ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setSortBy(tp.key)}
            >
              {tp.label}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All Leaderboard</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          {[{ value: "all" }, { value: "friends" }].map(({ value }) => (
            <TabsContent key={value} value={value} className="mt-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : currentData && currentData.length > 0 ? (
                <>
                  {/* Podium - Top 3 */}
                  {top3.length >= 3 && (
                    <div className="flex items-end justify-center gap-3 py-4">
                      {/* 2nd Place */}
                      <PodiumCard entry={top3[1]} rank={2} sortBy={sortBy} isMe={top3[1].user_id === user?.id} />
                      {/* 1st Place */}
                      <PodiumCard entry={top3[0]} rank={1} sortBy={sortBy} isMe={top3[0].user_id === user?.id} />
                      {/* 3rd Place */}
                      <PodiumCard entry={top3[2]} rank={3} sortBy={sortBy} isMe={top3[2].user_id === user?.id} />
                    </div>
                  )}

                  {/* Rest of leaderboard */}
                  <div className="space-y-2">
                    {rest.map((entry, idx) => {
                      const rank = idx + 4;
                      const isMe = entry.user_id === user?.id;
                      return (
                        <div key={entry.id} ref={isMe ? myRowRef : undefined}>
                          <LeaderboardRow entry={entry} rank={rank} sortBy={sortBy} isMe={isMe} />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-muted-foreground mb-2">
                    {value === "friends" ? "No friends in the leaderboard yet" : "No rankings yet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {value === "friends" ? "Add friends to compete with them!" : "Complete workouts to earn points!"}
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Jump to my rank FAB */}
      {showJumpBtn && activeTab === "all" && (
        <Button
          onClick={scrollToMe}
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-20 gap-2"
          size="sm"
        >
          <ChevronDown className="w-4 h-4" />
          My Rank
        </Button>
      )}
    </div>
  );
};

// Podium card for top 3
function PodiumCard({
  entry,
  rank,
  sortBy,
  isMe,
}: {
  entry: LeaderboardEntry & { userLevel?: { level: number; title: string } | null };
  rank: number;
  sortBy: SortKey;
  isMe: boolean;
}) {
  const isFirst = rank === 1;
  const heights: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" };
  const avatarSizes: Record<number, string> = { 1: "w-16 h-16", 2: "w-12 h-12", 3: "w-12 h-12" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const points = (entry as any)[sortBy] || 0;

  return (
    <div className={`flex flex-col items-center ${isFirst ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}>
      <div className="relative mb-2">
        <Avatar className={`${avatarSizes[rank]} ${isMe ? "ring-2 ring-primary" : "ring-2 ring-border"}`}>
          <AvatarImage src={entry.profile?.avatar_url || ""} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
            {entry.profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        {isFirst && <Crown className="w-5 h-5 text-yellow-500 absolute -top-3 left-1/2 -translate-x-1/2" />}
      </div>
      <p className="text-xs font-medium text-foreground text-center truncate max-w-[80px]">
        {entry.profile?.display_name || "Anonymous"}
      </p>
      {(entry as any).userLevel && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">
          {(entry as any).userLevel.title}
        </Badge>
      )}
      <p className="text-xs font-bold text-primary mt-1">{points.toLocaleString()} pts</p>
      <div className={`${heights[rank]} w-16 rounded-t-lg bg-primary/10 border border-primary/20 mt-2 flex items-start justify-center pt-2`}>
        <span className="text-lg">{medals[rank as keyof typeof medals]}</span>
      </div>
    </div>
  );
}

// Row for ranks 4+
function LeaderboardRow({
  entry,
  rank,
  sortBy,
  isMe,
}: {
  entry: LeaderboardEntry & { userLevel?: { level: number; title: string } | null };
  rank: number;
  sortBy: SortKey;
  isMe: boolean;
}) {
  const points = (entry as any)[sortBy] || 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`p-3 flex items-center gap-3 ${isMe ? "ring-2 ring-primary bg-primary/5" : ""}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground">
              {rank}
            </div>
            <Avatar className="w-10 h-10">
              <AvatarImage src={entry.profile?.avatar_url || ""} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {entry.profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-medium text-foreground text-sm truncate">
                  {entry.profile?.display_name || "Anonymous"}
                </h4>
                {isMe && <span className="text-xs text-primary font-medium">(You)</span>}
              </div>
              {(entry as any).userLevel && (
                <p className="text-[10px] text-muted-foreground">
                  Lv.{(entry as any).userLevel.level} {(entry as any).userLevel.title}
                </p>
              )}
            </div>
            <span className="text-sm font-semibold text-primary">{points.toLocaleString()}</span>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          <p>Weekly: {entry.weekly_points.toLocaleString()}</p>
          <p>Monthly: {entry.monthly_points.toLocaleString()}</p>
          <p>All Time: {entry.total_points.toLocaleString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ChallengeLeaderboard;
