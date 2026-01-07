import { ArrowLeft, Moon, Sunrise, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SleepTracker = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Sleep</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-6 text-center">
          <Moon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <p className="text-4xl font-bold text-foreground">7h 32m</p>
          <p className="text-sm text-muted-foreground mt-1">Last night's sleep</p>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-xs text-muted-foreground">Bedtime</p>
                <p className="font-semibold text-foreground">11:30 PM</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Sunrise className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Wake up</p>
                <p className="font-semibold text-foreground">7:02 AM</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Deep Sleep</p>
                <p className="font-semibold text-foreground">2h 15m</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Sleep Score</p>
                <p className="font-semibold text-foreground">85/100</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SleepTracker;
