import { ChevronRight, ChevronLeft, Star, Clock, Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";

interface Workout {
  id: string;
  title: string;
  instructor: string;
  duration: number;
  rating: number;
  calories: number;
  image: string;
  difficulty?: string;
  category?: string;
}

interface WorkoutsSectionProps {
  workouts?: Workout[];
  title?: string;
}

export function WorkoutsSection({ 
  workouts,
  title = "Workouts" 
}: WorkoutsSectionProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const defaultWorkouts: Workout[] = [
    {
      id: "1",
      title: "Total Body Circuit",
      instructor: "Coach Alejandro V.",
      duration: 50,
      rating: 4.5,
      calories: 128,
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
      difficulty: "Beginner",
      category: "strength",
    },
    {
      id: "2",
      title: "Mindful Pilates 101",
      instructor: "Coach Allanjon U. Wu",
      duration: 55,
      rating: 4.5,
      calories: 128,
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
      difficulty: "Intermediate",
      category: "pilates",
    },
    {
      id: "3",
      title: "HIIT Cardio Blast",
      instructor: "Coach Maria S.",
      duration: 30,
      rating: 4.8,
      calories: 250,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
      difficulty: "Advanced",
      category: "hiit",
    },
  ];

  const displayWorkouts = workouts || defaultWorkouts;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setCurrentIndex((prev) => 
        direction === "left" 
          ? Math.max(0, prev - 1) 
          : Math.min(displayWorkouts.length - 1, prev + 1)
      );
    }
  };

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
        <Badge variant="default" className="rounded-full px-4 py-1.5 bg-foreground text-background">
          All
        </Badge>
        <Badge variant="secondary" className="rounded-full px-4 py-1.5">
          Strength
        </Badge>
        <Badge variant="secondary" className="rounded-full px-4 py-1.5">
          Cardio
        </Badge>
        <Badge variant="secondary" className="rounded-full px-4 py-1.5">
          Yoga
        </Badge>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        >
          {displayWorkouts.map((workout) => (
            <Card 
              key={workout.id}
              className="flex-shrink-0 w-[260px] snap-start overflow-hidden border-0 shadow-card cursor-pointer group"
              onClick={() => navigate(`/workout/${workout.id}`)}
            >
              <div className="relative h-36">
                <img 
                  src={workout.image} 
                  alt={workout.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                </div>
                
                {/* Difficulty Badge */}
                {workout.difficulty && (
                  <Badge className="absolute top-2 left-2 bg-foreground/80 text-background text-xs">
                    {workout.difficulty}
                  </Badge>
                )}
                
                {/* Title */}
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="font-semibold text-white text-sm line-clamp-1">
                    {workout.title}
                  </h3>
                  <p className="text-xs text-white/80">{workout.instructor}</p>
                </div>
              </div>
              
              <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {workout.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  {workout.rating} stars
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-primary" />
                  {workout.calories} kcal
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 shadow-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 shadow-md flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {displayWorkouts.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              index === currentIndex ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
