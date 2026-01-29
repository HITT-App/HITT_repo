import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Play, X, Clock, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface InterruptedWorkout {
  id: string;
  workout_id: string;
  workout_title: string;
  current_exercise_index: number;
  elapsed_seconds: number;
  paused_at: string;
}

export function ResumeWorkoutBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interruptedWorkout, setInterruptedWorkout] = useState<InterruptedWorkout | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchInterruptedWorkout = async () => {
      try {
        // Find workouts that were started but not completed
        const { data } = await supabase
          .from("workout_progress")
          .select(`
            id,
            workout_id,
            current_exercise_index,
            elapsed_seconds,
            paused_at,
            workouts (title)
          `)
          .eq("user_id", user.id)
          .eq("status", "paused")
          .is("completed_at", null)
          .order("paused_at", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const workout = data[0];
          setInterruptedWorkout({
            id: workout.id,
            workout_id: workout.workout_id,
            workout_title: (workout.workouts as any)?.title || "Workout",
            current_exercise_index: workout.current_exercise_index || 0,
            elapsed_seconds: workout.elapsed_seconds || 0,
            paused_at: workout.paused_at!,
          });
        }
      } catch (error) {
        console.error("Error fetching interrupted workout:", error);
      }
    };

    fetchInterruptedWorkout();
  }, [user]);

  const handleResume = () => {
    if (interruptedWorkout) {
      navigate(`/workout/${interruptedWorkout.workout_id}?resume=${interruptedWorkout.id}`);
    }
  };

  const handleDismiss = async () => {
    if (interruptedWorkout) {
      // Mark as abandoned
      await supabase
        .from("workout_progress")
        .update({ status: "abandoned" })
        .eq("id", interruptedWorkout.id);
    }
    setDismissed(true);
  };

  if (!interruptedWorkout || dismissed) {
    return null;
  }

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <div className="mx-4 mb-4">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/20 rounded-2xl p-4 relative overflow-hidden">
        {/* Background pulse effect */}
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
        
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground z-10"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Dumbbell className="w-6 h-6 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-sm font-semibold text-foreground mb-1">
              Continue Your Workout
            </p>
            <p className="text-xs text-muted-foreground truncate mb-2">
              {interruptedWorkout.workout_title}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatElapsedTime(interruptedWorkout.elapsed_seconds)} done
              </span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(interruptedWorkout.paused_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Resume button */}
        <Button
          className="w-full mt-3 bg-primary hover:bg-primary/90 gap-2"
          onClick={handleResume}
        >
          <Play className="w-4 h-4" />
          Resume Workout
        </Button>
      </div>
    </div>
  );
}
