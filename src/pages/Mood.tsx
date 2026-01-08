import { ArrowLeft, Smile, Settings, ChevronRight, Bell, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

const moods = [
  { emoji: "😊", label: "Happy", color: "bg-yellow-100" },
  { emoji: "😐", label: "Neutral", color: "bg-gray-100" },
  { emoji: "😢", label: "Sad", color: "bg-blue-100" },
  { emoji: "😤", label: "Angry", color: "bg-red-100" },
  { emoji: "😰", label: "Anxious", color: "bg-purple-100" },
  { emoji: "🤩", label: "Overjoyed", color: "bg-orange-100" },
];

const Mood = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState("December 2025");
  const [currentMood] = useState("Happy");
  const [streak] = useState(7);

  const history = [
    { mood: "Overjoyed", note: "Feeling Bad", time: "10:00 AM" },
    { mood: "Happy", note: "Had a happy moment", time: "10:00 AM" },
    { mood: "Sad", note: "Tragic Event", time: "10:00 AM" },
  ];

  const calendarDays = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    mood: moods[Math.floor(Math.random() * moods.length)],
    logged: Math.random() > 0.3,
  }));

  const insights = {
    mostLogged: "Overjoyed",
    entries: 12,
    trend: "-5% vs last month"
  };

  const tags = ["Joyful", "Selfish", "Altruistic", "Mindful", "Grateful"];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Mood</h1>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Mood Display */}
        <Card className="p-6 text-center">
          <div className="text-5xl mb-2">😊</div>
          <h2 className="text-2xl font-bold text-foreground">{currentMood}</h2>
          <p className="text-sm text-muted-foreground">Logged today at 10:22 AM</p>
        </Card>

        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            {selectedMonth}
          </Button>
        </div>

        {/* Mood Calendar Grid */}
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.slice(0, 28).map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center text-lg ${
                  day.logged ? day.mood.color : 'bg-muted'
                }`}
              >
                {day.logged ? day.mood.emoji : <span className="text-xs text-muted-foreground">{day.day}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Log Mood Button */}
        <Button className="w-full" size="lg">
          Log Mood →
        </Button>

        {/* Mood Insight / Streak */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Mood Insight</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4 flex items-center gap-4">
            <div className="text-4xl">🏆</div>
            <div>
              <p className="text-lg font-bold text-foreground">{streak} days</p>
              <p className="text-sm text-muted-foreground">Mood Streak</p>
              <p className="text-xs text-muted-foreground">You've checked in your mood for {streak} days straight!</p>
            </div>
          </Card>
        </div>

        {/* Mood History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Mood History</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-xl">
                    {moods.find(m => m.label === item.mood)?.emoji || "😊"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.mood}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
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

        {/* Mood Reminder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Mood Reminder</h2>
            <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
          </div>
          <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Daily Reminder</p>
                <p className="text-xs text-muted-foreground">On 09:00 AM</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Card>
        </div>

        {/* Most Logged Tags */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Choose Tags (Optional)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button key={tag} variant="outline" size="sm" className="rounded-full">
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Mood Statistics */}
        <Card className="p-4">
          <h3 className="font-semibold text-foreground mb-3">Mood Insight</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Most Logged Mood</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">🤩</span>
                <span className="font-semibold">{insights.mostLogged}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entries this month</p>
              <p className="text-2xl font-bold">{insights.entries}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Trend</p>
            <p className="text-sm text-red-500">{insights.trend}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Mood;
