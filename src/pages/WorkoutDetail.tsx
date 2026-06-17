import { useState, useEffect, useMemo } from 'react';
import { HEmoji } from '@/components/HEmoji';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Play, Clock, Flame, Star, Share2,
  ChevronRight, Calendar, Bookmark, Dumbbell, Target, Repeat, Timer, Watch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeEmbedUrl } from '@/lib/video';
import { Capacitor } from '@capacitor/core';
import { sendStructuredWorkoutToWatch } from '@/plugins/WatchPlugin';

type Workout = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  calories_burned: number;
  body_areas: string[];
  equipment: string[];
  instructor_name: string;
  instructor_avatar: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  is_featured: boolean;
  rating: number;
  rating_count: number;
};

type Exercise = {
  id: string;
  title: string;
  description: string;
  duration_seconds: number;
  reps: number | null;
  sets: number | null;
  body_area: string;
  thumbnail_url: string | null;
  video_url: string | null;
  order_index: number;
};

export default function WorkoutDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState({ hour: 10, minute: 0 });
  const [isSaved, setIsSaved] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);

  useEffect(() => {
    if (id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Invalid Workout', description: 'This workout link is invalid.' });
        navigate('/workouts', { replace: true });
        return;
      }
      fetchWorkoutDetails();
    }
  }, [id]);

  const fetchWorkoutDetails = async () => {
    setIsLoading(true);
    try {
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts').select('*').eq('id', id).maybeSingle();

      if (workoutError) throw workoutError;
      if (!workoutData) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'This workout does not exist.' });
        navigate('/workouts', { replace: true });
        return;
      }
      setWorkout(workoutData);

      const { data: exercisesData } = await supabase
        .from('workout_exercises').select('*').eq('workout_id', id).order('order_index');
      setExercises(exercisesData || []);

      // Fetch completion count for this user
      if (user) {
        const { count } = await supabase
          .from('workout_progress')
          .select('*', { count: 'exact', head: true })
          .eq('workout_id', id!)
          .eq('user_id', user.id)
          .eq('status', 'completed');
        setCompletionCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching workout:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load workout' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!user || !workout) return;
    try {
      const scheduledDate = new Date(selectedDate);
      const { error } = await supabase.from('scheduled_workouts').insert({
        user_id: user.id, workout_id: workout.id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        scheduled_time: `${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}:00`,
        status: 'scheduled',
      });
      if (error) throw error;
      setShowSchedule(false);
      toast({ title: 'Workout Scheduled!', description: `${workout.title} scheduled for ${scheduledDate.toLocaleDateString()}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to schedule workout' });
    }
  };

  const startWorkout = () => navigate(`/workout-player/${id}`);

  const sendToWatch = async () => {
    if (!workout) return;
    await sendStructuredWorkoutToWatch({
      id: workout.id,
      name: workout.title,
      durationMinutes: workout.duration_minutes,
      exercises: exercises.map(ex => ({
        id: ex.id,
        name: ex.title,
        sets: ex.sets ?? undefined,
        reps: ex.reps ?? undefined,
        durationSeconds: ex.duration_seconds ?? undefined,
      })),
    });
    toast({ title: 'Sent to Apple Watch', description: 'Open your watch to start the workout.' });
  };

  const embedUrl = useMemo(() => {
    if (!workout?.video_url) return null;
    return getYouTubeEmbedUrl(workout.video_url);
  }, [workout?.video_url]);

  const isDirectVideo = workout?.video_url && !embedUrl;

  if (isLoading || !workout) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  const totalExerciseDuration = exercises.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const totalSets = exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  const totalReps = exercises.reduce((sum, e) => sum + (e.reps || 0) * (e.sets || 1), 0);

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-sm truncate flex-1 text-center px-2">{workout.title}</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSaved(!isSaved)}>
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-primary text-primary")} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
      {/* Hero / Video Section */}
      <div className="bg-gradient-to-br from-primary/30 to-secondary">
        {embedUrl ? (
          <div className="aspect-video w-full">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={workout.title}
            />
          </div>
        ) : isDirectVideo ? (
          <div className="aspect-video w-full">
            <video
              src={workout.video_url!}
              className="w-full h-full object-cover"
              controls
              playsInline
              poster={workout.thumbnail_url || undefined}
            />
          </div>
        ) : (
          <div className="h-52 relative">
            {workout.thumbnail_url && (
              <img src={workout.thumbnail_url} alt={workout.title} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        )}
      </div>

      <div className="overflow-x-hidden">
        <div className="p-4 space-y-5">
          {/* Title & Badges */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="capitalize">{workout.category}</Badge>
              <Badge variant={workout.difficulty === "advanced" ? "destructive" : workout.difficulty === "intermediate" ? "default" : "secondary"} className="capitalize">
                {workout.difficulty}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{workout.title}</h1>
            {workout.description && <p className="text-muted-foreground mt-1">{workout.description}</p>}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{workout.duration_minutes}</p>
              <p className="text-[10px] text-muted-foreground">Minutes</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <Flame className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{workout.calories_burned || '—'}</p>
              <p className="text-[10px] text-muted-foreground">Calories</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <Dumbbell className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{exercises.length}</p>
              <p className="text-[10px] text-muted-foreground">Exercises</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <Star className="w-4 h-4 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{workout.rating || '—'}</p>
              <p className="text-[10px] text-muted-foreground">Rating</p>
            </div>
          </div>

          {/* Your Progress */}
          {user && completionCount > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Your Progress</h3>
                  <Badge variant="secondary">{completionCount}x completed</Badge>
                </div>
                <Progress value={Math.min(completionCount * 20, 100)} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {completionCount >= 5 ? <><HEmoji name="leaderboard" size={16} style={{verticalAlign:'middle'}}/> Mastered!</> : `${5 - completionCount} more to master`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <div className="flex gap-3">
              <Button onClick={startWorkout} className="flex-1 h-12 rounded-2xl gap-2">
                <Play className="w-5 h-5" /> Start Workout
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl gap-2" onClick={() => setShowSchedule(true)}>
                <Calendar className="w-5 h-5" /> Schedule
              </Button>
            </div>
            {Capacitor.isNativePlatform() && exercises.length > 0 && (
              <Button variant="outline" onClick={sendToWatch} className="w-full h-11 rounded-2xl gap-2">
                <Watch className="w-4 h-4" /> Start on Apple Watch
              </Button>
            )}
          </div>

          {/* Exercise Breakdown Summary */}
          {exercises.length > 0 && (totalSets > 0 || totalReps > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {totalSets > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                  <Repeat className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{totalSets}</p>
                    <p className="text-[10px] text-muted-foreground">Total Sets</p>
                  </div>
                </div>
              )}
              {totalReps > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                  <Target className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{totalReps}</p>
                    <p className="text-[10px] text-muted-foreground">Total Reps</p>
                  </div>
                </div>
              )}
              {totalExerciseDuration > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                  <Timer className="w-4 h-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{Math.ceil(totalExerciseDuration / 60)}m</p>
                    <p className="text-[10px] text-muted-foreground">Active Time</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Body Areas & Equipment */}
          {((workout.body_areas?.length > 0) || (workout.equipment?.length > 0)) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                {workout.body_areas?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Target Muscles</p>
                    <div className="flex flex-wrap gap-2">
                      {workout.body_areas.map(area => (
                        <Badge key={area} variant="outline" className="capitalize">{area.replace('-', ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {workout.equipment?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Equipment Needed</p>
                    <div className="flex flex-wrap gap-2">
                      {workout.equipment.map(eq => (
                        <Badge key={eq} variant="secondary" className="capitalize">{eq.replace('-', ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Exercises List */}
          {exercises.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Exercises ({exercises.length})</h3>
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <Card key={exercise.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                        {exercise.thumbnail_url ? (
                          <img src={exercise.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-primary">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{exercise.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {exercise.sets && exercise.reps && (
                            <span>{exercise.sets} × {exercise.reps} reps</span>
                          )}
                          {exercise.sets && exercise.reps && exercise.duration_seconds && <span>·</span>}
                          {exercise.duration_seconds && (
                            <span>{exercise.duration_seconds >= 60 ? `${Math.floor(exercise.duration_seconds / 60)}m ${exercise.duration_seconds % 60}s` : `${exercise.duration_seconds}s`}</span>
                          )}
                          {exercise.body_area && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{exercise.body_area.replace('-', ' ')}</span>
                            </>
                          )}
                        </div>
                        {exercise.description && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{exercise.description}</p>
                        )}
                      </div>
                      {exercise.video_url && <Play className="w-4 h-4 text-primary flex-shrink-0" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Instructor */}
          {workout.instructor_name && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Workout Instructor</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={workout.instructor_avatar || undefined} />
                    <AvatarFallback>{workout.instructor_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{workout.instructor_name}</p>
                    <p className="text-sm text-muted-foreground">Certified Personal Trainer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="h-8" />
        </div>
      </div>
      </div>

      {/* Schedule Sheet */}
      <Sheet open={showSchedule} onOpenChange={setShowSchedule}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Schedule Workout</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <p className="text-sm text-muted-foreground">We'll send reminders before your workout</p>
            <div>
              <h4 className="font-medium mb-3">Select Date</h4>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((date, index) => {
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={cn("shrink-0 w-14 p-2 rounded-xl border-2 text-center transition-all", isSelected ? "border-primary bg-primary/5" : "border-border")}
                    >
                      <p className="text-xs text-muted-foreground">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                      <p className="font-bold text-sm">{date.getDate()}</p>
                      <p className="text-[10px] text-muted-foreground">{date.toLocaleDateString('en-US', { month: 'short' })}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Select Time</h4>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-32 overflow-y-auto">
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(hour => (
                      <button key={hour} onClick={() => setSelectedTime(prev => ({ ...prev, hour }))}
                        className={cn("block py-1.5 text-lg transition-all", selectedTime.hour === hour ? "font-bold text-primary" : "text-muted-foreground")}>
                        {hour.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <div className="h-32 overflow-y-auto">
                    {[0, 15, 30, 45].map(minute => (
                      <button key={minute} onClick={() => setSelectedTime(prev => ({ ...prev, minute }))}
                        className={cn("block py-1.5 text-lg transition-all", selectedTime.minute === minute ? "font-bold text-primary" : "text-muted-foreground")}>
                        {minute.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handleSchedule} className="w-full h-12 rounded-2xl">Confirm</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
