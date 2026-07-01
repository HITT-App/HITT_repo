import { useState } from "react";
import { HEmoji } from "@/components/HEmoji";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Search, Filter, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useActivity } from "@/hooks/useActivity";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, string> = {
  jogging: "🏃",
  swimming: "🏊",
  yoga: "🧘",
  "martial-arts": "🥋",
  aerobics: "💪",
  cycling: "🚴",
  walking: "🚶",
  other: "⚡",
};

const ActivityHistory = () => {
  const navigate = useNavigate();
  const { logs } = useActivity();
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [calorieRange, setCalorieRange] = useState([0, 500]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // "New since last visit" marker — set by share-prompt.ts after each sync.
  // Activities synced after this timestamp are flagged with a ✨ badge until
  // the user shares or the marker advances on next sync.
  const lastShareCheckISO = typeof window !== "undefined"
    ? localStorage.getItem("hitt_last_share_check_at")
    : null;
  const lastShareCheckMs = lastShareCheckISO ? new Date(lastShareCheckISO).getTime() : 0;

  const isNewSinceLastVisit = (startedAt: string) =>
    lastShareCheckMs > 0 && new Date(startedAt).getTime() > lastShareCheckMs;

  // Share now lives on the ActivityDetail page (tap → 'Share' in the header).
  // Keeping the row action set to just navigate keeps this list feeling like
  // a scannable overview rather than a tap-magnet.

  // Group logs by date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(parseISO(log.started_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (search && !log.activity_type.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (selectedTypes.length > 0 && !selectedTypes.includes(log.activity_type)) {
      return false;
    }
    if ((log.calories_burned || 0) < calorieRange[0] || (log.calories_burned || 0) > calorieRange[1]) {
      return false;
    }
    return true;
  });

  // Calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get activity count for each day
  const getActivityForDay = (day: Date) => {
    return logs.filter((log) => isSameDay(parseISO(log.started_at), day));
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">Activity History</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowFilter(true)}>
          <Filter className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="list">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {Object.entries(groupedLogs).length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No activities logged yet</p>
              </div>
            ) : (
              Object.entries(groupedLogs)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dayLogs]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {format(parseISO(date), "MMMM d, yyyy")}
                    </h3>
                    <div className="space-y-2">
                      {dayLogs
                        .filter((log) => filteredLogs.includes(log))
                        .map((log) => {
                          const isFresh = isNewSinceLastVisit(log.started_at);
                          return (
                            <Card
                              key={log.id}
                              className="p-4 cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/activity/${log.id}`)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  {(activityIcons[log.activity_type] || "⚡") === '💪' ? <HEmoji name="workouts" size={16}/> : <span className="text-xl">{activityIcons[log.activity_type] || "⚡"}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-medium capitalize truncate">
                                      {log.activity_type.replace("-", " ")}
                                    </h4>
                                    {isFresh && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium shrink-0">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {format(parseISO(log.started_at), "h:mm a")} -{" "}
                                    {Math.round((log.duration_seconds || 0) / 60)} min
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <div className="text-muted-foreground">
                                    <HEmoji name="streak" size={14} style={{verticalAlign:'middle'}}/> {log.calories_burned || 0} kcal
                                  </div>
                                  <div className="text-primary">+{log.score_impact} score</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                ))
            )}
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <Card className="p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))
                  }
                >
                  ←
                </Button>
                <h3 className="font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))
                  }
                >
                  →
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                  <div key={i} className="text-center text-xs text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const dayActivities = getActivityForDay(day);
                  const hasActivity = dayActivities.length > 0;

                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square flex flex-col items-center justify-center rounded-full text-sm",
                        !isSameMonth(day, currentMonth) && "text-muted-foreground/50",
                        hasActivity && "bg-primary/10"
                      )}
                    >
                      <span>{format(day, "d")}</span>
                      {hasActivity && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayActivities.slice(0, 3).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-1 h-1 rounded-full bg-primary"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilter} onOpenChange={setShowFilter}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filter Activity Results</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-6">
            {/* Activity Type */}
            <div>
              <h4 className="text-sm font-medium mb-3">Activity Type</h4>
              <div className="flex flex-wrap gap-2">
                {Object.keys(activityIcons).map((type) => (
                  <Badge
                    key={type}
                    variant={selectedTypes.includes(type) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleType(type)}
                  >
                    {type.replace("-", " ")}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Calorie Range */}
            <div>
              <h4 className="text-sm font-medium mb-3">Calorie Burn</h4>
              <Slider
                value={calorieRange}
                onValueChange={setCalorieRange}
                min={0}
                max={1000}
                step={50}
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{calorieRange[0]} kcal</span>
                <span>{calorieRange[1]} kcal</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setSelectedTypes([]);
                setCalorieRange([0, 500]);
              }}
            >
              Clear
            </Button>
            <Button className="flex-1" onClick={() => setShowFilter(false)}>
              Show Results ({filteredLogs.length})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
};

export default ActivityHistory;
