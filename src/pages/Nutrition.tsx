import { ArrowLeft, Apple, Droplet, Flame, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Nutrition = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Nutrition</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Daily Calories</span>
            <span className="text-sm font-medium">1,450 / 2,000</span>
          </div>
          <Progress value={72} className="h-3 mb-4" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">65g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">180g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">45g</p>
              <p className="text-xs text-muted-foreground">Fat</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Droplet className="w-6 h-6 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Water Intake</p>
              <p className="font-semibold text-foreground">6 / 8 glasses</p>
            </div>
            <Button size="icon" variant="ghost">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        <Button className="w-full btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Log Meal
        </Button>
      </div>
    </div>
  );
};

export default Nutrition;
