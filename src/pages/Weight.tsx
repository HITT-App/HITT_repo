import { ArrowLeft, Scale, Settings, TrendingUp, TrendingDown, Target, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const Weight = () => {
  const navigate = useNavigate();
  const [currentWeight] = useState(67.8);
  const [unit] = useState("kg");
  const [timeRange, setTimeRange] = useState("1m");

  const timeRanges = ["1w", "1m", "3m", "6m", "All Time"];

  const insights = {
    bmi: 20.08,
    bodyFat: "32.8%",
    metabolicAge: "22y"
  };

  const history = [
    { weight: "78 kg", change: "1,252 steps left", time: "10:00 AM" },
    { weight: "78 kg", change: "Goal completed", time: "10:00 AM", completed: true },
    { weight: "78 kg", change: "Mile With Your walk", time: "10:00 AM" },
  ];

  const weeklyData = [
    { day: "Mon", value: 68.2 },
    { day: "Tue", value: 67.8 },
    { day: "Wed", value: 68.0 },
    { day: "Thu", value: 67.5 },
    { day: "Fri", value: 67.8 },
    { day: "Sat", value: 67.2 },
    { day: "Sun", value: 67.8 },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Weight</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Weight Display */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-6 h-6 text-green-500" />
            <span className="text-4xl font-bold text-foreground">{currentWeight}</span>
            <span className="text-lg text-muted-foreground">{unit}</span>
          </div>
          <p className="text-sm text-green-600">You're on a normal weight range.</p>
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

        {/* Weight Chart */}
        <Card className="p-4">
          <div className="h-32 flex items-end justify-around gap-2">
            {weeklyData.map((day, i) => {
              const height = ((day.value - 66) / 3) * 100;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 bg-green-400 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Weight Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Weight Insights</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Body Mass Index</p>
                <p className="text-xl font-bold text-foreground">{insights.bmi}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-lg flex items-center justify-center mb-1">
                  <div className="w-8 h-12 bg-green-500 rounded" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Metabolic Age</p>
                <p className="text-xl font-bold text-foreground">{insights.metabolicAge}</p>
                <p className="text-xs text-muted-foreground">Than average of your group</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Body Fat</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-foreground">{insights.bodyFat}</p>
                <span className="text-xs text-red-500">▼ 4% vs last month</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Weight History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Weight History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-100' : 'bg-muted'}`}>
                    <Scale className={`w-5 h-5 ${item.completed ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.weight}</p>
                    <p className={`text-xs ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`}>{item.change}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Weight Goal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Weight Goal</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">60.00kg</p>
                <p className="text-xs text-muted-foreground">Weight Goal</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You're on track! Keep logging your weight daily to improve your health & overall score.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>55%</span>
              <span>61.1kg</span>
            </div>
            <Progress value={55} className="h-2" />
            <Button variant="link" className="text-primary p-0 h-auto mt-2 text-sm">
              Edit Goal
            </Button>
          </Card>
        </div>

        {/* Log Button */}
        <Button className="w-full" size="lg">
          <Scale className="w-5 h-5 mr-2" />
          Log Weight
        </Button>
      </div>
    </div>
  );
};

export default Weight;
