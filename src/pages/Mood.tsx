import { ArrowLeft, Smile, Settings, ChevronRight, Bell, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { recordActiveDay } from "@/lib/activeDay";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate] = useState(new Date());

  // Fetch today's checkin
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todayCheckin } = useQuery({
    queryKey: ["mood-today", user?.id, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch month checkins for calendar
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const { data: monthCheckins = [] } = useQuery({
    queryKey: ["mood-month", user?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent history
  const { data: history = [] } = useQuery({
    queryKey: ["mood-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Log mood mutation
  const logMood = useMutation({
    mutationFn: async (mood: string) => {
      const { error } = await supabase.from("daily_checkins").upsert(
        { user_id: user!.id, mood, date: today },
        { onConflict: "user_id,date" }
      );
      if (error) throw error;
      recordActiveDay(supabase, user!.id).catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-today"] });
      queryClient.invalidateQueries({ queryKey: ["mood-month"] });
      queryClient.invalidateQueries({ queryKey: ["mood-history"] });
      queryClient.invalidateQueries({ queryKey: ["today-mood"] });
      toast.success("Mood logged!");
    },
    onError: () => toast.error("Failed to log mood"),
  });

  const currentMoodData = todayCheckin
    ? moods.find((m) => m.label.toLowerCase() === todayCheckin.mood?.toLowerCase())
    : null;

  // Calendar days
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const checkinMap = new Map(monthCheckins.map((c: any) => [c.date, c.mood]));

  // Streak
  const streak = (() => {
    let count = 0;
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date();
      expected.setDate(expected.getDate() - i);
      if (sorted[i].date === format(expected, "yyyy-MM-dd")) count++;
      else break;
    }
    return count;
  })();

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-semibold text-foreground">Mood</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><Settings className="w-5 h-5" /></Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Current Mood */}
        <Card className="p-6 text-center">
          <div className="text-5xl mb-2">{currentMoodData?.emoji || "🙂"}</div>
          <h2 className="text-2xl font-bold text-foreground">
            {currentMoodData?.label || "How are you feeling?"}
          </h2>
          {todayCheckin && (
            <p className="text-sm text-muted-foreground">Logged today</p>
          )}
        </Card>

        {/* Mood Selector */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Log Today's Mood</h2>
          <div className="grid grid-cols-3 gap-3">
            {moods.map((mood) => (
              <Button
                key={mood.label}
                variant={currentMoodData?.label === mood.label ? "default" : "outline"}
                className="flex flex-col h-auto py-3"
                onClick={() => logMood.mutate(mood.label.toLowerCase())}
                disabled={logMood.isPending}
              >
                <span className="text-2xl mb-1">{mood.emoji}</span>
                <span className="text-xs">{mood.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <Card className="p-4">
          <p className="font-semibold text-foreground mb-3">{format(selectedDate, "MMMM yyyy")}</p>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Offset for first day */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const moodStr = checkinMap.get(dateStr);
              const moodData = moodStr ? moods.find((m) => m.label.toLowerCase() === moodStr) : null;
              return (
                <div
                  key={dateStr}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                    moodData ? moodData.color : "bg-muted"
                  }`}
                >
                  {moodData ? (
                    <span className="text-lg">{moodData.emoji}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{day.getDate()}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Streak */}
        {streak > 0 && (
          <Card className="p-4 flex items-center gap-4">
            <div className="text-4xl">🏆</div>
            <div>
              <p className="text-lg font-bold text-foreground">{streak} day{streak > 1 ? "s" : ""}</p>
              <p className="text-sm text-muted-foreground">Mood Streak</p>
            </div>
          </Card>
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Mood History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No mood entries yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 7).map((item: any) => {
                const moodData = moods.find((m) => m.label.toLowerCase() === item.mood?.toLowerCase());
                return (
                  <Card key={item.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${moodData?.color || "bg-muted"}`}>
                        {moodData?.emoji || "🙂"}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground capitalize">{item.mood}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(item.date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    {item.energy && (
                      <span className="text-xs text-muted-foreground">Energy: {item.energy}/5</span>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mood;
