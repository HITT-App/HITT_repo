import { useState, useMemo } from "react";
import { ArrowLeft, Dumbbell, Play, Clock, Flame, Search, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "HIIT", "Strength", "Cardio", "Yoga", "Flexibility", "Martial Arts", "Swimming", "Cycling"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  HIIT: "⚡", Strength: "💪", Cardio: "🏃", Yoga: "🧘", Flexibility: "🤸",
  "Martial Arts": "🥊", Swimming: "🏊", Cycling: "🚴",
};

const Workouts = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("category")
        .order("difficulty")
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = workouts;
    if (activeCategory !== "All") list = list.filter((w) => w.category === activeCategory);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.title.toLowerCase().includes(q) || w.category.toLowerCase().includes(q));
    }
    return list;
  }, [workouts, activeCategory, search]);

  const difficultyColor = (d: string) => {
    if (d === "beginner") return "text-green-400 border-green-400/30";
    if (d === "intermediate") return "text-amber-400 border-amber-400/30";
    return "text-red-400 border-red-400/30";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Workouts</h1>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} workouts</span>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search workouts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground border border-border"
              )}
            >
              {cat !== "All" && <span className="mr-1">{CATEGORY_ICONS[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Workout list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading workouts...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No workouts found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((workout) => (
              <Card
                key={workout.id}
                className="p-4 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/workout/${workout.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {CATEGORY_ICONS[workout.category] || <Dumbbell className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{workout.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {workout.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {workout.calories_burned || "—"} cal
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={cn("text-[10px] h-5", difficultyColor(workout.difficulty))}>
                        {workout.difficulty}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{workout.category}</span>
                    </div>
                  </div>
                  <Button size="icon" className="rounded-full shrink-0" onClick={(e) => { e.stopPropagation(); navigate(`/workout-player/${workout.id}`); }}>
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workouts;
