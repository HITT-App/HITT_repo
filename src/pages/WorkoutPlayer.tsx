import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStreaksAndBadges } from '@/hooks/useStreaksAndBadges';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HIITLogo } from '@/components/HIITLogo';
import { notifyUser, schedulePBShareReminder } from '@/lib/notify';
import { AIFormAnalysis } from '@/components/workout/AIFormAnalysis';
import { NewBadgeModal } from '@/components/gamification/NewBadgeModal';
import { CompletionSummary } from '@/components/workout/CompletionSummary';
import { startWorkoutMirroring, endWorkoutMirroring, sendWorkoutToWatch } from '@/plugins/WatchPlugin';
import { 
  ArrowLeft, Play, Pause, SkipForward, SkipBack, 
  MoreHorizontal, Volume2, Settings, Download, Share2, Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Workout = {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  calories_burned: number;
};

type Exercise = {
  id: string;
  title: string;
  description: string;
  duration_seconds: number;
  body_area: string;
  order_index: number;
};

type PlayerState = 'countdown' | 'playing' | 'paused' | 'completed';

type PBKind = 'duration' | 'calories' | 'streak';

type DetectedPB = {
  kind: PBKind;
  label: string;
  value: number;
  previousBest: number;
};

export default function WorkoutPlayer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { recordWorkout, newBadges, clearNewBadges } = useStreaksAndBadges();
  const [pointsEarned, setPointsEarned] = useState(0);
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFormAnalysis, setShowFormAnalysis] = useState(false);
  const [rating, setRating] = useState(0);
  const [detectedPBs, setDetectedPBs] = useState<DetectedPB[]>([]);
  
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) {
      fetchWorkoutData();
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (playerState === 'countdown' && countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (playerState === 'countdown' && countdown === 0) {
      startExercise();
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdown, playerState]);

  useEffect(() => {
    if (playerState === 'playing' && timeRemaining > 0) {
      playTimerRef.current = setTimeout(() => {
        setTimeRemaining(t => t - 1);
        setTotalElapsed(t => t + 1);
      }, 1000);
    } else if (playerState === 'playing' && timeRemaining === 0 && exercises.length > 0) {
      nextExercise();
    }
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, [timeRemaining, playerState]);

  const fetchWorkoutData = async () => {
    try {
      const { data: workoutData } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single();

      if (workoutData) {
        setWorkout(workoutData);
        // Tell Watch to navigate to Ready screen
        startWorkoutMirroring('hiit', workoutData.title);
        // Also push workout plan to Watch via WatchConnectivity for older watchOS
        sendWorkoutToWatch({
          id: workoutData.id,
          name: workoutData.title,
          durationMinutes: workoutData.duration_minutes ?? 30,
          exercises: [],
        });
      }

      const { data: exercisesData } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', id)
        .order('order_index');

      if (exercisesData && exercisesData.length > 0) {
        setExercises(exercisesData);
        setTimeRemaining(exercisesData[0].duration_seconds || 45);
      }
    } catch (error) {
      console.error('Error fetching workout:', error);
    }
  };

  const startExercise = () => {
    setPlayerState('playing');
    if (exercises[currentExerciseIndex]) {
      setTimeRemaining(exercises[currentExerciseIndex].duration_seconds || 45);
    }
  };

  const togglePlayPause = () => {
    setPlayerState(prev => prev === 'playing' ? 'paused' : 'playing');
  };

  const nextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setTimeRemaining(exercises[currentExerciseIndex + 1].duration_seconds || 45);
    } else {
      completeWorkout();
    }
  };

  const prevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      setTimeRemaining(exercises[currentExerciseIndex - 1].duration_seconds || 45);
    }
  };

  const detectPBs = async (userId: string, newDurationSec: number, newCalories: number): Promise<DetectedPB[]> => {
    const pbs: DetectedPB[] = [];
    try {
      const { data: durationMax } = await supabase
        .from('workout_progress')
        .select('duration_seconds')
        .eq('user_id', userId)
        .order('duration_seconds', { ascending: false })
        .limit(2);
      const previousDurationMax = durationMax?.[1]?.duration_seconds ?? 0;
      if (previousDurationMax > 0 && newDurationSec > previousDurationMax) {
        pbs.push({ kind: 'duration', label: 'longest workout', value: Math.round(newDurationSec / 60), previousBest: Math.round(previousDurationMax / 60) });
      }

      const { data: calorieMax } = await supabase
        .from('workout_progress')
        .select('calories_burned')
        .eq('user_id', userId)
        .not('calories_burned', 'is', null)
        .order('calories_burned', { ascending: false })
        .limit(2);
      const previousCalorieMax = calorieMax?.[1]?.calories_burned ?? 0;
      if (previousCalorieMax > 0 && newCalories > previousCalorieMax) {
        pbs.push({ kind: 'calories', label: 'biggest calorie burn', value: Math.round(newCalories), previousBest: Math.round(previousCalorieMax) });
      }

      const { data: streaks } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', userId)
        .maybeSingle();
      if (streaks && streaks.longest_streak > 0 && streaks.current_streak > streaks.longest_streak) {
        pbs.push({ kind: 'streak', label: `${streaks.current_streak}-day streak`, value: streaks.current_streak, previousBest: streaks.longest_streak });
      }
    } catch (err) {
      console.error('[PB Detection] failed:', err);
    }
    return pbs;
  };

  const completeWorkout = async () => {
    setPlayerState('completed');
    setShowCompleted(true);
    endWorkoutMirroring();

    if (user && workout) {
      try {
        await supabase.from('workout_progress').insert({
          user_id: user.id,
          workout_id: workout.id,
          duration_seconds: totalElapsed,
        });
        
        // Update streak and check for new badges
        const pts = await recordWorkout();
        setPointsEarned(pts);

        // Detect PBs now that streak + progress rows are committed
        const pbs = await detectPBs(user.id, totalElapsed, workoutCalories);
        setDetectedPBs(pbs);

        // Schedule a local push reminder to fire in 30 min if user hasn't shared yet
        if (pbs.length > 0 && workout) {
          const notifId = await schedulePBShareReminder(
            workout.id,
            workout.title,
            pbs.map(pb => ({ kind: pb.kind, label: pb.label, value: pb.value }))
          );
          if (notifId !== null) {
            sessionStorage.setItem(`pb_notif_${workout.id}`, String(notifId));
          }
        }

        // Push notification — sent after a delay so it arrives when app is backgrounded
        setTimeout(() => {
          notifyUser(user.id, "workout", "Workout complete! 💪",
            `You finished ${workout.title}. Great work!`, "/workout-library");
        }, 3000);

        // Open Jarvis with post-workout share nudge — delayed so user sees completion summary first
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hitt:open-jarvis-share', {
            detail: {
              workoutId: workout.id,
              workoutTitle: workout.title,
              durationMin: workoutDurationMin,
              calories: workoutCalories,
              pbs,
            }
          }));
        }, 8000);
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }
  };

  const handleFinish = () => {
    clearNewBadges();
    toast({ title: 'Great workout!', description: 'Your progress has been saved.' });
    navigate('/workout-library');
  };

  const workoutDurationMin = Math.floor(totalElapsed / 60);
  // MET-based calorie calculation: MET × weight(kg) × duration(hours)
  // Default to 7 cal/min if no MET value available
  const metValue = (workout as any)?.met_value ?? 5.0;
  const userWeightKg = 75; // TODO: fetch from profile/health_metrics
  const workoutCalories = workout?.calories_burned || Math.round(metValue * userWeightKg * (workoutDurationMin / 60));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;
  const totalDuration = exercises.reduce((acc, ex) => acc + (ex.duration_seconds || 45), 0);

  // Countdown Screen
  if (playerState === 'countdown') {
    return (
      <div className="h-dvh bg-background flex flex-col items-center justify-center p-6 overflow-hidden">
        <p className="text-xl mb-6">
          {countdown === 3 ? 'Are you ready?' : countdown === 2 ? 'Just do your best.' : 'Good Luck!'}
        </p>
        <div className="text-[120px] font-bold text-primary leading-none">{countdown}</div>
        <HIITLogo size="lg" className="mt-10" />
        <Button
          variant="ghost"
          size="sm"
          className="mt-8 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  // Completed Screen
  if (showCompleted) {
    const completionStats = [
      { label: 'Duration', value: workoutDurationMin, unit: 'min' },
      { label: 'Calories', value: workoutCalories, unit: 'kcal' },
      { label: 'Exercises', value: exercises.length },
    ];

    const ratingSection = (
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground mb-3">How was the workout?</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="text-3xl transition-transform hover:scale-110"
            >
              {star <= rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>
    );

    return (
      <>
        <CompletionSummary
          activityTitle={workout?.title || 'Workout'}
          stats={completionStats}
          achievementMessage={
            detectedPBs.length > 0
              ? `🏆 New PB — ${detectedPBs.map(pb => pb.label).join(' + ')}!`
              : newBadges.length > 0 ? 'New achievement unlocked!' : undefined
          }
          pbLabel={detectedPBs.length > 0 ? detectedPBs.map(pb => pb.label).join(' + ') : undefined}
          badges={newBadges.map(b => ({ name: b.name, icon: b.icon }))}
          pointsEarned={pointsEarned}
          onDone={handleFinish}
          ratingSection={ratingSection}
          postData={{
            duration: workoutDurationMin,
            calories: workoutCalories,
            type: workout?.title || 'Workout',
          }}
        />
        <NewBadgeModal badges={newBadges} onClose={clearNewBadges} />
      </>
    );
  }

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Video/Exercise Area */}
      <div className="relative flex-1 bg-gradient-to-b from-secondary to-background min-h-0">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/50 backdrop-blur">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold">{currentExercise?.title || workout?.title}</h2>
          <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur" onClick={() => setShowMenu(true)}>
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>

        {/* Exercise Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-6xl font-bold mb-2">{formatTime(timeRemaining)}</p>
            <p className="text-muted-foreground">
              {currentExercise?.body_area ? `Target: ${currentExercise.body_area}` : 'Focus on your form'}
            </p>
          </div>
        </div>

        {/* Paused Overlay */}
        {playerState === 'paused' && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur flex items-center justify-center">
            <p className="text-2xl font-bold">Paused</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 space-y-6">
        {/* Coming up next */}
        {currentExerciseIndex < exercises.length - 1 && (
          <div className="flex items-center justify-between bg-card p-3 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary">{currentExerciseIndex + 2}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coming up next</p>
                <p className="font-medium">{exercises[currentExerciseIndex + 1]?.title}</p>
              </div>
            </div>
            <Button size="icon" className="rounded-full" onClick={nextExercise}>
              <Play className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(totalElapsed)}</span>
            <span>-{formatTime(totalDuration - totalElapsed)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8">
          <Button variant="ghost" size="icon" className="rounded-full w-14 h-14" onClick={prevExercise}>
            <SkipBack className="w-6 h-6" />
          </Button>
          <Button 
            size="icon" 
            className="rounded-full w-16 h-16 bg-primary hover:bg-primary/90"
            onClick={togglePlayPause}
          >
            {playerState === 'playing' ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full w-14 h-14" onClick={nextExercise}>
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Menu Sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent side="top" className="rounded-b-3xl">
          <div className="py-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { setShowMenu(false); setShowFormAnalysis(true); }}>
              <Camera className="w-5 h-5" /> AI Form Check
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => { setShowMenu(false); setShowPlaylist(true); }}>
              <Settings className="w-5 h-5" /> Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setShowPlaylist(true)}>
              <Play className="w-5 h-5" /> Playlist
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Download className="w-5 h-5" /> Download
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Share2 className="w-5 h-5" /> Share
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Playlist Sheet */}
      <Sheet open={showPlaylist} onOpenChange={setShowPlaylist}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Workout Playlist</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mb-4">{workout?.title}: Strength Starts Here</p>
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <button
                key={exercise.id}
                onClick={() => {
                  setCurrentExerciseIndex(index);
                  setTimeRemaining(exercise.duration_seconds || 45);
                  setShowPlaylist(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  index === currentExerciseIndex ? "bg-primary/10 border border-primary" : "hover:bg-secondary"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold",
                  index < currentExerciseIndex ? "bg-accent text-accent-foreground" :
                  index === currentExerciseIndex ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  Part {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{exercise.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor((exercise.duration_seconds || 45) / 60)}min · {exercise.body_area || 'Full Body'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* AI Form Analysis */}
      <AIFormAnalysis 
        exerciseName={currentExercise?.title || workout?.title || 'Exercise'}
        isOpen={showFormAnalysis}
        onClose={() => setShowFormAnalysis(false)}
      />

      {/* New Badge Modal */}
      <NewBadgeModal badges={newBadges} onClose={clearNewBadges} />
    </div>
  );
}
