import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft, Play, Clock, Flame, Star, Heart, Share2, 
  ChevronRight, Calendar, Settings, Bookmark, Download, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState({ hour: 10, minute: 0 });
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (id) {
      // Validate UUID format before querying
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
        .from('workouts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (workoutError) throw workoutError;
      if (!workoutData) {
        toast({ variant: 'destructive', title: 'Not Found', description: 'This workout does not exist.' });
        navigate('/workouts', { replace: true });
        return;
      }
      setWorkout(workoutData);

      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', id)
        .order('order_index');

      if (exercisesError) throw exercisesError;
      setExercises(exercisesData || []);
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
        user_id: user.id,
        workout_id: workout.id,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        scheduled_time: `${selectedTime.hour.toString().padStart(2, '0')}:${selectedTime.minute.toString().padStart(2, '0')}:00`,
        status: 'scheduled',
      });

      if (error) throw error;

      setShowSchedule(false);
      toast({ title: 'Workout Scheduled!', description: `${workout.title} scheduled for ${scheduledDate.toLocaleDateString()}` });
    } catch (error) {
      console.error('Error scheduling workout:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to schedule workout' });
    }
  };

  const startWorkout = () => {
    navigate(`/workout-player/${id}`);
  };

  if (isLoading || !workout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const dates = Array.from({ length: 4 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-64 bg-gradient-to-br from-primary/30 to-secondary">
        {workout.thumbnail_url && (
          <img 
            src={workout.thumbnail_url} 
            alt={workout.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/50 backdrop-blur">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-background/50 backdrop-blur"
              onClick={() => setIsSaved(!isSaved)}
            >
              <Bookmark className={cn("w-5 h-5", isSaved && "fill-primary text-primary")} />
            </Button>
          </div>
        </div>

        {/* Category Badge */}
        <Badge className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary capitalize">
          {workout.category}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-256px)]">
        <div className="p-4 -mt-16 relative z-10 space-y-6">
          {/* Title & Stats */}
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{workout.title}</h1>
            <p className="text-muted-foreground mb-4">{workout.description}</p>
            
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{workout.duration_minutes}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  {workout.rating}
                </p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold">{exercises.length}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button onClick={startWorkout} className="flex-1 h-12 rounded-2xl gap-2">
              <Play className="w-5 h-5" /> Start Program
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl gap-2"
              onClick={() => setShowSchedule(true)}
            >
              <Calendar className="w-5 h-5" /> Schedule
            </Button>
          </div>

          {/* Overview */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Overview</h3>
              <p className="text-sm text-muted-foreground">{workout.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{workout.duration_minutes} min</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{workout.calories_burned} kcal</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </div>
                </div>
              </div>

              {workout.equipment && workout.equipment.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Equipment Needed</p>
                  <div className="flex flex-wrap gap-2">
                    {workout.equipment.map(eq => (
                      <Badge key={eq} variant="secondary" className="capitalize">
                        {eq.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Body Area Focus */}
          {workout.body_areas && workout.body_areas.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Body Area Focus</h3>
                <div className="flex flex-wrap gap-2">
                  {workout.body_areas.map(area => (
                    <Badge key={area} variant="outline" className="capitalize">
                      {area.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exercises List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Exercises List</h3>
              <Button variant="link" size="sm" className="text-primary">See All</Button>
            </div>
            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <Card key={exercise.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                      {exercise.thumbnail_url ? (
                        <img src={exercise.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-muted-foreground">{index + 1}</span>
                      )}
                      <Badge className="absolute top-1 left-1 text-[8px] px-1" variant="secondary">
                        Part {index + 1}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{exercise.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{exercise.duration_seconds ? `${Math.floor(exercise.duration_seconds / 60)}min` : 'N/A'}</span>
                        {exercise.body_area && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{exercise.body_area}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
                  <Button variant="ghost" size="sm" className="text-primary">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Schedule Sheet */}
      <Sheet open={showSchedule} onOpenChange={setShowSchedule}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Schedule Workout</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <p className="text-sm text-muted-foreground">We'll send reminders before your workout so you can prepare</p>
            
            {/* Date Selection */}
            <div>
              <h4 className="font-medium mb-3">Select Date</h4>
              <div className="flex gap-3">
                {dates.map((date, index) => {
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex-1 p-3 rounded-xl border-2 text-center transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="font-bold">{date.getDate()}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <h4 className="font-medium mb-3">Select Time</h4>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-32 overflow-hidden relative">
                    {[8, 9, 10, 11, 12].map(hour => (
                      <button
                        key={hour}
                        onClick={() => setSelectedTime(prev => ({ ...prev, hour }))}
                        className={cn(
                          "block py-2 text-lg transition-all",
                          selectedTime.hour === hour ? "font-bold text-primary" : "text-muted-foreground"
                        )}
                      >
                        {hour.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-2xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <div className="h-32 overflow-hidden relative">
                    {[0, 15, 30, 45].map(minute => (
                      <button
                        key={minute}
                        onClick={() => setSelectedTime(prev => ({ ...prev, minute }))}
                        className={cn(
                          "block py-2 text-lg transition-all",
                          selectedTime.minute === minute ? "font-bold text-primary" : "text-muted-foreground"
                        )}
                      >
                        {minute.toString().padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleSchedule} className="w-full h-12 rounded-2xl">
              Confirm
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
