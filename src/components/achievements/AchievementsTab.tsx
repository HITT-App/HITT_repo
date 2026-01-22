import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap
} from "lucide-react";

// Achievement icon mapping
const achievementIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  apple: <Apple className="w-6 h-6" />,
  dumbbell: <Dumbbell className="w-6 h-6" />,
  footprints: <Footprints className="w-6 h-6" />,
  bike: <Bike className="w-6 h-6" />,
  moon: <Moon className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
};

// Active achievements with progress
const activeAchievements = [
  { id: 1, name: "First Steps", description: "Take your first 100 steps", icon: "footprints", level: 1, current: 90, total: 100, color: "bg-purple-500" },
  { id: 2, name: "Hydration Homie", description: "Drink a total of 5,000ml of water", icon: "target", level: 1, current: 250, total: 5000, color: "bg-blue-500" },
  { id: 3, name: "Sleepyhead 2.0", description: "Achieve Wake Up Average at 8AM", icon: "zap", level: 2, current: 20, total: 100, color: "bg-orange-500" },
  { id: 4, name: "Weight Warrior", description: "Lose 10kg of total weight", icon: "flame", level: 1, current: 65, total: 100, color: "bg-red-500" },
];

// All achievements grid
const allAchievements = [
  { id: 1, name: "Heart Champ", icon: "heart", unlocked: true, color: "bg-orange-500" },
  { id: 2, name: "Goal Oriented", icon: "target", unlocked: true, color: "bg-orange-500" },
  { id: 3, name: "Fitness God", icon: "flame", unlocked: true, color: "bg-orange-500" },
  { id: 4, name: "Nutrition Pal", icon: "apple", unlocked: true, color: "bg-purple-500" },
  { id: 5, name: "Carb Addict", icon: "dumbbell", unlocked: true, color: "bg-orange-500" },
  { id: 6, name: "HIIT Explorer", icon: "zap", unlocked: false, color: "bg-gray-400" },
  { id: 7, name: "Cycle Master", icon: "bike", unlocked: false, color: "bg-gray-400" },
  { id: 8, name: "Jog Addict", icon: "footprints", unlocked: true, color: "bg-orange-500" },
  { id: 9, name: "I, Fitness", icon: "trophy", unlocked: true, color: "bg-orange-500" },
  { id: 10, name: "Sandow", icon: "award", unlocked: false, color: "bg-gray-400" },
  { id: 11, name: "Coach Hunter", icon: "star", unlocked: true, color: "bg-orange-500" },
  { id: 12, name: "Improve", icon: "zap", unlocked: false, color: "bg-gray-400" },
];

// Latest/new achievements
const latestAchievements = [
  { id: 1, name: "Fit Hero", icon: "💪", color: "bg-purple-500", isNew: true },
  { id: 2, name: "Powerful Legs", icon: "🦵", color: "bg-blue-500", isNew: true },
  { id: 3, name: "Cardio King", icon: "❤️", color: "bg-red-500", isNew: false },
];

const AchievementsTab = () => {
  const navigate = useNavigate();
  const { earnedBadges, allBadges } = useStreaksAndBadges();
  
  const unlockedCount = earnedBadges?.length || 12;

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Unlocked Count */}
      <div className="text-center">
        <p className="text-5xl font-bold text-foreground">{unlockedCount}</p>
        <p className="text-muted-foreground">Achievements Unlocked</p>
      </div>

      {/* Locked Badges Preview */}
      <div className="flex justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <span className="text-xs text-muted-foreground">Locked</span>
            <span className="text-[10px] text-muted-foreground/70">Let's Unlock!</span>
          </div>
        ))}
      </div>

      {/* Latest Achievement Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Latest Achievement</h3>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/achievements/all")}
          >
            See All
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {latestAchievements.map((achievement) => (
              <Card 
                key={achievement.id}
                className="min-w-[120px] p-4 flex flex-col items-center gap-2 relative cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/achievements/${achievement.id}`)}
              >
                {achievement.isNew && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
                <div className={`w-16 h-16 rounded-2xl ${achievement.color} flex items-center justify-center text-3xl`}>
                  {achievement.icon}
                </div>
                <span className="text-sm font-medium text-center">{achievement.name}</span>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Active Achievements Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Active Achievements</h3>
          <Button variant="link" className="text-primary p-0 h-auto text-sm">
            See All
          </Button>
        </div>
        <div className="space-y-3">
          {activeAchievements.map((achievement) => (
            <Card 
              key={achievement.id}
              className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/achievements/${achievement.id}`)}
            >
              <div className={`w-12 h-12 rounded-xl ${achievement.color} flex items-center justify-center text-white`}>
                {achievementIcons[achievement.icon] || <Trophy className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{achievement.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Level {achievement.level}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {achievement.current}/{achievement.total}
                  </span>
                </div>
                <Progress 
                  value={(achievement.current / achievement.total) * 100} 
                  className="h-1.5 mt-2"
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round((achievement.current / achievement.total) * 100)}%
              </span>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AchievementsTab;
