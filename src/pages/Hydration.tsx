import { ArrowLeft, Droplets, Settings, TrendingUp, Clock, Target, ChevronRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const Hydration = () => {
  const navigate = useNavigate();
  const [currentIntake] = useState(1287);
  const [goal] = useState(2500);
  const [timeRange, setTimeRange] = useState("1d");

  const timeRanges = ["1h", "1d", "1w", "1m", "All Time"];
  const progressPercent = (currentIntake / goal) * 100;
  const remaining = goal - currentIntake;

  const insights = {
    weekTotal: "4.2L",
    avgDaily: "2.2L",
    mostActive: "12:01 AM"
  };

  const history = [
    { amount: "258 ml", remaining: "200ml left", time: "10:00 AM" },
    { amount: "258 ml", completed: true, time: "11:02 AM" },
    { amount: "258 ml", remaining: "200ml left", time: "10:00 AM" },
  ];

  const weeklyData = [
    { day: "Mon", value: 80 },
    { day: "Tue", value: 60 },
    { day: "Wed", value: 90 },
    { day: "Thu", value: 45 },
    { day: "Fri", value: 70 },
    { day: "Sat", value: 85 },
    { day: "Sun", value: 55 },
  ];

  const quickAdd = [
    { label: "Small", amount: "150ml", icon: "🥤" },
    { label: "Medium", amount: "250ml", icon: "🥤" },
    { label: "Large", amount: "500ml", icon: "🥤" },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Hydration</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Intake Display */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Droplets className="w-6 h-6 text-blue-500" />
            <span className="text-4xl font-bold text-foreground">{currentIntake.toLocaleString()}</span>
            <span className="text-lg text-muted-foreground">ml</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">You need {remaining}ml for today</p>
          
          {/* Water Level Visualization */}
          <div className="relative w-20 h-32 mx-auto mb-4 border-2 border-blue-300 rounded-lg overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 right-0 bg-blue-400 transition-all duration-500"
              style={{ height: `${progressPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{Math.round(progressPercent)}%</span>
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

        {/* Hydration Chart */}
        <Card className="p-4">
          <div className="h-32 flex items-end justify-around gap-2">
            {weeklyData.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-6 bg-blue-400 rounded-t"
                  style={{ height: `${day.value}%` }}
                />
                <span className="text-xs text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Add */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Quick Add Water</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickAdd.map((item) => (
              <Button key={item.label} variant="outline" className="flex flex-col h-auto py-4">
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.amount}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Hydration Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Hydration Insight</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Total this week</p>
                <p className="text-lg font-bold text-foreground">{insights.weekTotal}</p>
              </div>
              <div>
                <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Avg daily</p>
                <p className="text-lg font-bold text-foreground">{insights.avgDaily}</p>
              </div>
              <div>
                <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Most active</p>
                <p className="text-lg font-bold text-foreground">{insights.mostActive}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              You consumed the most amount of water on Jun 10, 2025 - that's 8 glasses of water!
            </p>
          </Card>
        </div>

        {/* Hydration History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Hydration History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Droplets className={`w-5 h-5 ${item.completed ? 'text-green-500' : 'text-blue-500'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.amount}</p>
                    <p className={`text-xs ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {item.completed ? 'Goal completed' : item.remaining}
                    </p>
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

        {/* Hydration Goal */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Hydration Goal</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-lg font-bold text-foreground">2,500ml</p>
                <p className="text-xs text-muted-foreground">Daily water intake</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You're on track! Keep logging your drink daily to improve your health & overall score.
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

        {/* Log Button */}
        <Button className="w-full" size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Log Water
        </Button>
      </div>
    </div>
  );
};

export default Hydration;
