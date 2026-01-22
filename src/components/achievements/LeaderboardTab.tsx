import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

// Mock leaderboard data
const leaderboardData = [
  { id: 1, name: "Julia Francis", rank: 1, points: 4558, avatar: "", badge: "🏅" },
  { id: 2, name: "Azunyan U. Wu", rank: 2, points: 4558, avatar: "", badge: "🥈" },
  { id: 3, name: "Desmond Morris", rank: 3, points: 4558, avatar: "", badge: "🥉" },
  { id: 4, name: "Frank Waterson", rank: 4, points: 4558, avatar: "", badge: "💜" },
  { id: 5, name: "Julia Roberts", rank: 5, points: 4558, avatar: "", badge: "💚" },
];

const rankColors: Record<number, string> = {
  1: "bg-orange-500",
  2: "bg-orange-400",
  3: "bg-orange-300",
  4: "bg-purple-400",
  5: "bg-green-400",
};

const LeaderboardTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("gym");

  // User stats
  const userPoints = 4841;
  const userRank = 42;
  const userBadge = "Health Hero";

  return (
    <div className="pt-4">
      {/* Sub-tabs: Gym, Worldwide, Friends */}
      <div className="px-4 mb-6">
        <div className="flex justify-center gap-6">
          {["Gym", "Worldwide", "Friends"].map((tab) => (
            <button
              key={tab}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                subTab === tab.toLowerCase()
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
              onClick={() => setSubTab(tab.toLowerCase())}
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
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {user?.email?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-4xl font-bold text-foreground mb-2">{userPoints.toLocaleString()}pts</p>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="text-red-500">❤️</span> {userBadge}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-500">🏆</span> #{userRank} ranked
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Your Gym Leaderboard Rank</h3>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/leaderboard")}
          >
            See All
          </Button>
        </div>

        <div className="space-y-3">
          {leaderboardData.map((player) => (
            <Card 
              key={player.id}
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src={player.avatar} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {player.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{player.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Ranked #{player.rank} • {player.points.toLocaleString()}pts
                </p>
              </div>
              
              <div className={`w-10 h-10 rounded-xl ${rankColors[player.rank] || "bg-gray-400"} flex items-center justify-center text-lg`}>
                {player.rank <= 3 ? (
                  <span>{["🥇", "🥈", "🥉"][player.rank - 1]}</span>
                ) : (
                  <span className="text-white font-bold text-sm">{player.rank}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTab;
