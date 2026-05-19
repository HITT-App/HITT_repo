import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HEmoji } from "@/components/HEmoji";

const AchievementsIntro = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Trophy Illustration */}
      <div className="relative mb-8">
        <div className="w-48 h-48 relative">
          {/* Trophy glow effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/20 to-transparent rounded-full blur-2xl" />
          <div className="relative text-[140px] leading-none"><HEmoji name="leaderboard" size={140}/></div>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-3">
        Explore your fitness &<br />wellness achievements
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground mb-10">
        Lets explore what you have accomplished<br />so far with this app.
      </p>

      {/* CTA Button */}
      <Button 
        className="w-full max-w-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-6"
        onClick={() => navigate("/achievements")}
      >
        <Trophy className="w-5 h-5 mr-2" />
        Explore Achievements
      </Button>
    </div>
  );
};

export default AchievementsIntro;
