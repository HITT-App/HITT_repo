import { ArrowLeft, Activity, Settings, TrendingUp, TrendingDown, Clock, ChevronRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const BloodPressure = () => {
  const navigate = useNavigate();
  const [systolic] = useState(128);
  const [diastolic] = useState(60);
  const [timeRange, setTimeRange] = useState("1d");

  const timeRanges = ["1h", "1d", "1w", "1m", "All Time"];

  const insights = {
    systolicRange: "130-147",
    diastolicRange: "86-97",
    pulseRate: "80-97"
  };

  const ranges = [
    { label: "Normal", systolic: "<120/<80mmHg", color: "bg-green-500" },
    { label: "Elevated", systolic: "120-129/<80mmHg", color: "bg-yellow-500" },
    { label: "Hypertension Stage 1", systolic: "130-139/80-89mmHg", color: "bg-orange-500" },
    { label: "Hypertension Stage 2", systolic: "140+/90+mmHg", color: "bg-red-500" },
  ];

  const history = [
    { reading: "128/80 mmHg", status: "Above Optimal", time: "10:00AM" },
    { reading: "128/80 mmHg", status: "Slightly Above Range", time: "10:00AM" },
    { reading: "128/80 mmHg", status: "within Optimal Range", time: "10:00AM", optimal: true },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Blood Pressure</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Reading Display */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="w-6 h-6 text-purple-500" />
            <span className="text-4xl font-bold text-foreground">{systolic}/{diastolic}</span>
            <span className="text-lg text-muted-foreground">mmHg</span>
          </div>
          <p className="text-sm text-yellow-600">Slightly above optimal range</p>
        </Card>

        {/* Circular Gauge */}
        <Card className="p-6">
          <div className="relative w-40 h-40 mx-auto">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="12"
                strokeDasharray={`${(systolic / 200) * 440} 440`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{systolic}</span>
              <span className="text-sm text-muted-foreground">sys</span>
              <div className="w-8 h-px bg-border my-1" />
              <span className="text-3xl font-bold">{diastolic}</span>
              <span className="text-sm text-muted-foreground">dia</span>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Your readings are in the normal range. Keep up with regular monitoring.
          </p>
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

        {/* Blood Pressure Chart */}
        <Card className="p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-muted-foreground">Systolic</span>
            <span className="text-xs text-muted-foreground">Diastolic</span>
            <span className="text-xs text-muted-foreground">Average</span>
          </div>
          <div className="h-32 flex items-center justify-center">
            <div className="w-full h-24 relative">
              {/* Systolic line */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  points="0,60 40,55 80,50 120,65 160,58 200,62 240,55 280,60"
                />
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  points="0,75 40,80 80,78 120,82 160,76 200,80 240,78 280,75"
                />
              </svg>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>1w</span>
            <span>1m</span>
            <span>3m</span>
            <span>6m</span>
            <span>All Time</span>
          </div>
        </Card>

        {/* Blood Pressure Insight */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Blood Pressure Insight</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4 space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Systolic</p>
                <p className="text-lg font-bold text-foreground">{insights.systolicRange}</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diastolic</p>
                <p className="text-lg font-bold text-foreground">{insights.diastolicRange}</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pulse Rate</p>
                <p className="text-lg font-bold text-foreground">{insights.pulseRate}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
            </div>
          </Card>
        </div>

        {/* What Your Numbers Mean */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">About Blood Pressure</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4 space-y-3">
            {ranges.map((range) => (
              <div key={range.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${range.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{range.label}</p>
                  <p className="text-xs text-muted-foreground">{range.systolic}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Blood Pressure History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Blood Pressure History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.optimal ? 'bg-green-100' : 'bg-purple-100'}`}>
                    <Activity className={`w-5 h-5 ${item.optimal ? 'text-green-500' : 'text-purple-500'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.reading}</p>
                    <p className={`text-xs ${item.optimal ? 'text-green-600' : 'text-yellow-600'}`}>{item.status}</p>
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

        {/* Log Button */}
        <Button className="w-full" size="lg">
          <Activity className="w-5 h-5 mr-2" />
          Log Blood Pressure
        </Button>
      </div>
    </div>
  );
};

export default BloodPressure;
