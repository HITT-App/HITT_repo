import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { 
  ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, 
  Plus, Dumbbell, Play, MoreHorizontal, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

type ScheduledWorkout = {
  id: string;
  workout_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  workout: {
    id: string;
    title: string;
    duration_minutes: number;
    category: string;
    thumbnail_url: string | null;
  };
};

export default function WorkoutSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchScheduledWorkouts();
    }
  }, [user, currentDate]);

  const fetchScheduledWorkouts = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);

      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select(`
          id,
          workout_id,
          scheduled_date,
          scheduled_time,
          status,
          workout:workouts (
            id,
            title,
            duration_minutes,
            category,
            thumbnail_url
          )
        `)
        .eq('user_id', user.id)
        .gte('scheduled_date', weekStart.toISOString().split('T')[0])
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0])
        .order('scheduled_date')
        .order('scheduled_time');

      if (error) throw error;
      setScheduledWorkouts((data as unknown as ScheduledWorkout[]) || []);
    } catch (error) {
      console.error('Error fetching scheduled workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteScheduledWorkout = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setScheduledWorkouts(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Workout removed from schedule' });
    } catch (error) {
      console.error('Error deleting scheduled workout:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove workout' });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));

  const getWorkoutsForDate = (date: Date) => {
    return scheduledWorkouts.filter(w => 
      isSameDay(parseISO(w.scheduled_date), date)
    );
  };

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          Workout Schedule ({view === 'daily' ? 'Daily' : 'Weekly'})
        </h1>
        <Button variant="ghost" size="icon" onClick={() => navigate('/workout-library')}>
          <Calendar className="w-5 h-5" />
        </Button>
      </header>

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
        <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-medium">
          {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'd')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Week Days */}
      <div className="flex border-b border-border">
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, currentDate);
          const hasWorkouts = getWorkoutsForDate(day).length > 0;

          return (
            <button
              key={index}
              onClick={() => setCurrentDate(day)}
              className={cn(
                "flex-1 py-3 text-center transition-all relative",
                isSelected && "bg-primary/10"
              )}
            >
              <p className="text-xs text-muted-foreground">{format(day, 'EEE').slice(0, 2)}</p>
              <p className={cn(
                "text-lg font-semibold mt-1",
                isToday && "text-primary"
              )}>
                {format(day, 'd')}
              </p>
              {hasWorkouts && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'weekly')} className="p-4">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="relative">
              {timeSlots.map(hour => {
                const workoutsAtHour = scheduledWorkouts.filter(w => {
                  if (!isSameDay(parseISO(w.scheduled_date), currentDate)) return false;
                  if (!w.scheduled_time) return false;
                  const workoutHour = parseInt(w.scheduled_time.split(':')[0]);
                  return workoutHour === hour;
                });

                return (
                  <div key={hour} className="flex min-h-[80px] border-b border-border/50">
                    <div className="w-16 py-2 text-xs text-muted-foreground text-right pr-3 flex-shrink-0">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </div>
                    <div className="flex-1 py-2 px-2 relative">
                      {workoutsAtHour.map(workout => (
                        <Card 
                          key={workout.id}
                          className="mb-2 bg-primary/10 border-primary/20 cursor-pointer"
                          onClick={() => navigate(`/workout/${workout.workout_id}`)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                              {workout.workout?.thumbnail_url ? (
                                <img src={workout.workout.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Dumbbell className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{workout.workout?.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {workout.workout?.duration_minutes}min · {workout.workout?.category}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteScheduledWorkout(workout.id);
                              }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                      {workoutsAtHour.length === 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 hover:opacity-100 transition-opacity"
                          onClick={() => navigate('/workout-library')}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="weekly" className="mt-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const date = weekDays[(index + 1) % 7];
                const dayWorkouts = getWorkoutsForDate(date);

                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{day}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary"
                        onClick={() => navigate('/workout-library')}
                      >
                        Add
                      </Button>
                    </div>
                    {dayWorkouts.length > 0 ? (
                      <div className="space-y-2">
                        {dayWorkouts.map(workout => (
                          <Card 
                            key={workout.id}
                            className="cursor-pointer"
                            onClick={() => navigate(`/workout/${workout.workout_id}`)}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                {workout.workout?.thumbnail_url ? (
                                  <img src={workout.workout.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Dumbbell className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{workout.workout?.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{workout.workout?.duration_minutes}min</span>
                                  <span>·</span>
                                  <span className="capitalize">{workout.workout?.category}</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={(e) => {
                                e.stopPropagation();
                                deleteScheduledWorkout(workout.id);
                              }}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-3">No workouts scheduled</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {scheduledWorkouts.length === 0 && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">You don't have any active workout for today.</h2>
          <p className="text-muted-foreground mb-6">Let's log your first meal today and get started.</p>
          <Button onClick={() => navigate('/workout-library')} className="gap-2">
            Explore Workouts <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      
    </div>
  );
}
