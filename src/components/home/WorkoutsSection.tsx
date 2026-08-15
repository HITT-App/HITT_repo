import { Clock, Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storageImage, IMG } from "@/lib/storage-image";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "hiit", label: "HIIT" },
  { id: "strength", label: "Strength" },
  { id: "cardio", label: "Cardio" },
  { id: "flexibility", label: "Yoga" },
] as const;

type CategoryId = typeof CATEGORIES[number]["id"];

interface Workout {
  id: string;
  title: string;
  duration_minutes: number;
  calories_burned: number | null;
  thumbnail_url: string | null;
  difficulty: string | null;
  category: string | null;
}

export function WorkoutsSection() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    const q = supabase
      .from("workouts")
      .select("id, title, duration_minutes, calories_burned, thumbnail_url, difficulty, category")
      .order("is_featured", { ascending: false })
      .limit(10);

    if (activeCategory !== "all") {
      q.eq("category", activeCategory);
    }

    q.then(({ data }) => setWorkouts(data || []));
  }, [activeCategory]);

  return (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Workouts</h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/workout-library")}
        >
          See All
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {workouts.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-4">No workouts found.</p>
        ) : (
          workouts.map((workout) => (
            <Card
              key={workout.id}
              className="flex-shrink-0 w-[240px] snap-start overflow-hidden border-0 shadow-card cursor-pointer group"
              onClick={() => navigate(`/workout/${workout.id}`)}
            >
              <div className="relative h-32">
                {workout.thumbnail_url ? (
                  <img src={storageImage(workout.thumbnail_url, IMG.card)} alt={workout.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
                {workout.difficulty && (
                  <Badge className="absolute top-2 left-2 bg-foreground/80 text-background text-xs capitalize">
                    {workout.difficulty}
                  </Badge>
                )}
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="font-semibold text-white text-sm line-clamp-1">{workout.title}</h3>
                </div>
              </div>
              <div className="p-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {workout.duration_minutes} min
                </span>
                {workout.calories_burned && (
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-primary" />
                    {workout.calories_burned} kcal
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
