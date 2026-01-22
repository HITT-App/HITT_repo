import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { Heart } from "lucide-react";

// Mock achievement data
const achievementData: Record<string, {
  name: string;
  description: string;
  icon: string;
  level: number;
  earnedDate: string;
  nextMilestone: string;
  progress: number;
}> = {
  "1": {
    name: "Heart Champ",
    description: "Log your heartrate for 30 days in a row. Congratulations!! ❤️",
    icon: "❤️",
    level: 1,
    earnedDate: "Nov 2025",
    nextMilestone: "Hold for 2 years",
    progress: 20,
  },
  "2": {
    name: "Goal Oriented",
    description: "Complete 100 fitness goals. Amazing dedication!",
    icon: "🎯",
    level: 2,
    earnedDate: "Oct 2025",
    nextMilestone: "Complete 200 goals",
    progress: 45,
  },
};

const AchievementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const achievement = achievementData[id || "1"] || achievementData["1"];

  return (
    <div className="min-h-screen bg-background">
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

      <div className="px-4 pb-8">
        {/* Achievement Badge */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {/* Hexagonal badge */}
            <div className="w-32 h-32 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(24, 95%, 53%)" />
                  </linearGradient>
                </defs>
                <polygon 
                  points="50,5 93,25 93,75 50,95 7,75 7,25" 
                  fill="url(#badgeGradient)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          <span className="text-primary text-sm font-medium mb-2">LEVEL {achievement.level}</span>
          
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
            <Calendar className="w-4 h-4" />
            Earned {achievement.earnedDate}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{achievement.name}</h1>
          <p className="text-center text-muted-foreground max-w-xs">
            {achievement.description}
          </p>
        </div>

        {/* Next Milestone */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="text-muted-foreground">🏆</span>
              </div>
              <span className="text-sm font-medium">Level 2</span>
            </div>
            <span className="text-sm text-muted-foreground">Next Milestone</span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">{achievement.nextMilestone}</span>
            <span className="font-medium">{achievement.progress}%</span>
          </div>
          
          <Progress value={achievement.progress} className="h-2" />
        </Card>

        {/* Share Button */}
        <Button 
          className="w-full bg-primary hover:bg-primary/90"
          onClick={() => setShowUnlockModal(true)}
        >
          Share <Share2 className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Achievement Unlocked Modal */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="max-w-sm rounded-3xl overflow-hidden p-0">
          {/* Confetti header */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 relative overflow-hidden">
            {/* Confetti dots */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5],
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
            
            {/* Badge */}
            <div className="relative flex justify-center">
              <div className="w-24 h-24 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="modalBadgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(24, 95%, 53%)" />
                    </linearGradient>
                  </defs>
                  <polygon 
                    points="50,5 93,25 93,75 50,95 7,75 7,25" 
                    fill="url(#modalBadgeGradient)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Heart className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <p className="text-primary text-sm font-medium mb-2">ACHIEVEMENT UNLOCKED!</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">{achievement.name}</h2>
            <p className="text-muted-foreground text-sm mb-6">{achievement.description}</p>

            <Button 
              className="w-full bg-primary hover:bg-primary/90 mb-3"
              onClick={() => setShowUnlockModal(false)}
            >
              Great, thanks! ✓
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowUnlockModal(false)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AchievementDetail;
