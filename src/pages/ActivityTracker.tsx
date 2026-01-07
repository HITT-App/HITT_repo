import { ArrowLeft, Flame, Footprints, Timer, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const ActivityTracker = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Activity</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Today's Goal</span>
            <span className="text-sm font-medium text-primary">75%</span>
          </div>
          <Progress value={75} className="h-3" />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <Footprints className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">8,432</p>
            <p className="text-xs text-muted-foreground">Steps</p>
          </Card>
          <Card className="p-4 text-center">
            <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">420</p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </Card>
          <Card className="p-4 text-center">
            <Timer className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">45</p>
            <p className="text-xs text-muted-foreground">Active Min</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">3.2</p>
            <p className="text-xs text-muted-foreground">Miles</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ActivityTracker;
