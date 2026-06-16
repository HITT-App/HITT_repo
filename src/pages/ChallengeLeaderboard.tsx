import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, RefreshCw, Trophy, Crown, ChevronDown, Loader2, TrendingUp, Flame, Users, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
type TimePeriod = { label: string; key: SortKey; icon: typeof TrendingUp };

const TIME_PERIODS: TimePeriod[] = [
  { label: "All Time", key: "total_points", icon: Globe },
  { label: "Monthly", key: "monthly_points", icon: TrendingUp },
  { label: "Weekly", key: "weekly_points", icon: Flame },
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
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Derive my rank & points from the ACTIVE sorted data, not stale DB rank
  const currentData = activeTab === "all" ? allLeaderboard : friendsLeaderboard;
  const isLoading = activeTab === "all" ? allLoading : friendsLoading;

  const { myRank, myPoints } = useMemo(() => {
    if (!user?.id || !currentData) {
      return { myRank: userRanking?.rank_position || null, myPoints: 0 };
    }
    const myIdx = currentData.findIndex(e => e.user_id === user.id);
    if (myIdx === -1) {
      return { myRank: null, myPoints: 0 };
    }
    return {
      myRank: myIdx + 1,
      myPoints: (currentData[myIdx] as any)[sortBy] || 0,
    };
  }, [currentData, user?.id, sortBy, userRanking]);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      queryClient.invalidateQueries({ queryKey: ["friends-leaderboard"] }),
      queryClient.invalidateQueries({ queryKey: ["user-ranking"] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const scrollToMe = () => {
    myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const top3 = currentData?.slice(0, 3) || [];
  const rest = currentData?.slice(3) || [];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Leaderboard</h1>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleRefresh}>
          <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 space-y-4 mt-2 pb-28">
        {/* Your Place */}
        <Card className="p-4 bg-primary/5 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center justify-between mb-2 relative">
            <span className="text-sm text-muted-foreground">Your Place</span>
            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs text-primary font-medium">
                {myRank ? `Ranked #${myRank}` : "Unranked"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 relative">
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
          {TIME_PERIODS.map((tp) => {
            const Icon = tp.icon;
            return (
              <Button
                key={tp.key}
                variant={sortBy === tp.key ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs gap-1"
                onClick={() => setSortBy(tp.key)}
              >
                <Icon className="w-3.5 h-3.5" />
                {tp.label}
              </Button>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all" className="gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              All Leaderboard
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Friends
            </TabsTrigger>
          </TabsList>

          {[{ value: "all" }, { value: "friends" }].map(({ value }) => (
            <TabsContent key={value} value={value} className="mt-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading rankings…</p>
                </div>
              ) : currentData && currentData.length > 0 ? (
                <>
                  {/* Podium - Top 3 (show even with 1-2 entries) */}
                  {top3.length > 0 && (
                    <div className="flex items-end justify-center gap-3 py-4">
                      {top3.length >= 2 && (
                        <PodiumCard entry={top3[1]} rank={2} sortBy={sortBy} isMe={top3[1].user_id === user?.id} />
                      )}
                      <PodiumCard entry={top3[0]} rank={1} sortBy={sortBy} isMe={top3[0].user_id === user?.id} />
                      {top3.length >= 3 && (
                        <PodiumCard entry={top3[2]} rank={3} sortBy={sortBy} isMe={top3[2].user_id === user?.id} />
                      )}
                    </div>
                  )}

                  {/* Rest of leaderboard */}
                  {rest.length > 0 && (
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
                  )}
                </>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <div className="flex justify-center mb-3">
                    {value === "friends" ? (
                      <Users className="w-10 h-10 text-muted-foreground/50" />
                    ) : (
                      <Trophy className="w-10 h-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <p className="text-muted-foreground font-medium mb-1">
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
  const ringColor = isMe ? "ring-2 ring-primary" : isFirst ? "ring-2 ring-primary/80" : "ring-2 ring-border";

  return (
    <div className={`flex flex-col items-center ${isFirst ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}>
      <div className="relative mb-2">
        <Avatar className={`${avatarSizes[rank]} ${ringColor}`}>
          <AvatarImage src={entry.profile?.avatar_url || ""} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
            {entry.profile?.display_name?.substring(0, 2).toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        {isFirst && <Crown className="w-5 h-5 text-yellow-500 absolute -top-3 left-1/2 -translate-x-1/2" />}
        {isMe && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1.5 rounded-full font-bold">
            YOU
          </div>
        )}
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
          <Card className={`p-3 flex items-center gap-3 transition-colors ${isMe ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/30"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
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
