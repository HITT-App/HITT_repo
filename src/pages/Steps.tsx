import { ArrowLeft, Footprints, Settings, TrendingUp, Clock, Target, ChevronRight, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const Steps = () => {
  const navigate = useNavigate();
  const [currentSteps] = useState(1258);
  const [goal] = useState(10000);
  const [timeRange, setTimeRange] = useState("1d");

  const timeRanges = ["1h", "1d", "1w", "1m", "All Time"];
  const progressPercent = (currentSteps / goal) * 100;

  const insights = {
    today: 5158,
    average: 12,
    unit: "steps"
  };

  const history = [
    { steps: "1,268", time: "10:00 AM" },
    { steps: "77", time: "11:23 AM" },
    { steps: "158", time: "12:11 PM" },
  ];

  const connectedDevices = [
    { name: "Garmin Watch", connected: true },
    { name: "Apple Watch X", connected: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Steps</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Steps Display */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Footprints className="w-6 h-6 text-primary" />
            <span className="text-4xl font-bold text-foreground">{currentSteps.toLocaleString()}</span>
            <span className="text-lg text-muted-foreground">steps</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Take {(goal - currentSteps).toLocaleString()} more steps today!</p>
          
          {/* Progress Ring Visualization */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${progressPercent * 3.52} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(progressPercent)}%</span>
              <span className="text-xs text-muted-foreground">of {goal.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Time Range Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="whitespace-nowrap"
            >
              {range}
            </Button>
          ))}
        </div>

        {/* Steps Chart */}
        <Card className="p-4">
          <div className="h-32 flex items-end justify-around gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-primary rounded-t"
                style={{ height: `${10 + Math.random() * 90}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>12AM</span>
            <span>6AM</span>
            <span>12PM</span>
            <span>6PM</span>
            <span>Now</span>
          </div>
        </Card>

        {/* Steps Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Steps Insights</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-lg font-bold text-foreground">{insights.today.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-bold text-foreground">{insights.average}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              You're taking more steps than you usually do.
            </p>
          </Card>
        </div>

        {/* Steps History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Steps History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Footprints className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">{item.steps} steps</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Goal Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Goal</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">1,500</p>
                <p className="text-xs text-muted-foreground">Total steps daily</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You're on track! Keep taking steps daily to improve your health & overall score.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>30%</span>
              <span>2,500 Total</span>
            </div>
            <Progress value={30} className="h-2" />
            <Button variant="link" className="text-primary p-0 h-auto mt-2 text-sm">
              Edit Goal
            </Button>
          </Card>
        </div>

        {/* Connected Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Connected Device</h2>
            <Button variant="link" className="text-primary p-0 h-auto">Edit Devices</Button>
          </div>
          <div className="space-y-2">
            {connectedDevices.map((device, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Watch className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{device.name}</span>
                </div>
                {device.connected && (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Log Button */}
        <Button className="w-full" size="lg">
          <Footprints className="w-5 h-5 mr-2" />
          Log Steps
        </Button>
      </div>
    </div>
  );
};

export default Steps;
