import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap, HelpCircle
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

// All achievements grid
const allAchievements = [
  { id: 1, name: "Heart Champ", icon: "heart", unlocked: true },
  { id: 2, name: "Goal Oriented", icon: "target", unlocked: true },
  { id: 3, name: "Fitness God", icon: "flame", unlocked: true },
  { id: 4, name: "Nutrition Pal", icon: "apple", unlocked: true },
  { id: 5, name: "Carb Addict", icon: "dumbbell", unlocked: true },
  { id: 6, name: "HIIT Explorer", icon: "zap", unlocked: false },
  { id: 7, name: "Cycle Master", icon: "bike", unlocked: false },
  { id: 8, name: "Jog Addict", icon: "footprints", unlocked: true },
  { id: 9, name: "I, Fitness", icon: "trophy", unlocked: true },
  { id: 10, name: "Sandow", icon: "award", unlocked: false },
  { id: 11, name: "Coach Hunter", icon: "star", unlocked: true },
  { id: 12, name: "Improve", icon: "zap", unlocked: false },
];

const AllAchievements = () => {
  const navigate = useNavigate();

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;
  const totalCount = allAchievements.length;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">My Achievements</h1>
        <p className="text-muted-foreground mb-6">
          You have {unlockedCount * 18} achievements so far
        </p>

        {/* Achievements Grid */}
        <div className="grid grid-cols-3 gap-4">
          {allAchievements.map((achievement) => (
            <div 
              key={achievement.id}
              className="flex flex-col items-center gap-2 cursor-pointer"
              onClick={() => achievement.unlocked && navigate(`/achievements/${achievement.id}`)}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                achievement.unlocked 
                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" 
                  : "bg-muted/50 text-muted-foreground border-2 border-dashed border-muted-foreground/30"
              }`}>
                {achievement.unlocked ? (
                  achievementIcons[achievement.icon] || <Trophy className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs text-center text-muted-foreground">
                {achievement.name}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                {achievement.unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllAchievements;
