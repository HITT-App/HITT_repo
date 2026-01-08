import { ArrowLeft, Heart, Settings, TrendingUp, TrendingDown, Clock, Activity, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

const HeartRate = () => {
  const navigate = useNavigate();
  const [currentBPM] = useState(75.8);
  const [timeRange, setTimeRange] = useState("1d");

  const timeRanges = ["1h", "1d", "1w", "1m", "All Time"];

  const highlights = [
    { label: "Peak", value: "158", unit: "bpm", status: "Normal Range", icon: TrendingUp },
    { label: "Resting", value: "72", unit: "bpm", status: "Lower Than usual", icon: Heart },
    { label: "HRV", value: "62", unit: "ms", status: "Optimal", icon: Activity },
    { label: "Average", value: "58", unit: "bpm", status: "Optimal", icon: TrendingDown },
  ];

  const history = [
    { bpm: "128", status: "Normal Range", time: "10:00AM" },
    { bpm: "102", status: "Normal Range", time: "10:00AM" },
    { bpm: "98", status: "Normal Range", time: "10:00AM" },
  ];

  const zones = [
    { name: "High Heart Rate", range: "140+ bpm", color: "bg-red-500" },
    { name: "Moderate Heart Rate", range: "100-140 bpm", color: "bg-primary" },
    { name: "Low Heart Rate", range: "60-100 bpm", color: "bg-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Heart Rate</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current BPM Display */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-6 h-6 text-red-500" />
            <span className="text-4xl font-bold text-foreground">{currentBPM}</span>
            <span className="text-lg text-muted-foreground">BPM</span>
          </div>
          <p className="text-sm text-green-600">Within a healthy resting rate.</p>
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

        {/* Heart Rate Chart Placeholder */}
        <Card className="p-4">
          <div className="h-32 flex items-end justify-around gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-red-400 rounded-t"
                style={{ height: `${20 + Math.random() * 80}%` }}
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

        {/* Highlight & Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Highlight & Insights</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">{item.value}</span>
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">{item.status}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Heart Rate History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Heart Rate History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.bpm} bpm</p>
                    <p className="text-xs text-green-600">{item.status}</p>
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

        {/* Heart Rate Zones */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Heart Rate Zones</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4 space-y-3">
            {zones.map((zone) => (
              <div key={zone.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${zone.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{zone.name}</p>
                  <p className="text-xs text-muted-foreground">{zone.range}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Log Button */}
        <Button className="w-full" size="lg">
          <Heart className="w-5 h-5 mr-2" />
          Log my heartrate
        </Button>
      </div>
    </div>
  );
};

export default HeartRate;
