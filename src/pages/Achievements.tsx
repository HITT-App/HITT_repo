import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useAuth } from "@/hooks/useAuth";
import AchievementsTab from "@/components/achievements/AchievementsTab";
import LeaderboardTab from "@/components/achievements/LeaderboardTab";
import StatsTab from "@/components/achievements/StatsTab";

const Achievements = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("achievement");

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Achievements</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Tabs */}
      <div className="flex-1 overflow-y-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 rounded-full p-1">
            <TabsTrigger 
              value="achievement" 
              className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Achievement
            </TabsTrigger>
            <TabsTrigger 
              value="leaderboard" 
              className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Leaderboard
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              Stats
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="achievement" className="mt-0">
          <AchievementsTab />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          <LeaderboardTab />
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <StatsTab />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default Achievements;
