import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock,
  Plus, Dumbbell, Play, MoreHorizontal, Trash2, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks } from 'date-fns';

type ScheduledWorkout = {
  id: string;
  workout_id: string | null;
  workout_source: string;
  workout_title: string | null;
  estimated_duration_minutes: number | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  workout: {
    id: string;
    title: string;
    duration_minutes: number;
    category: string;
    thumbnail_url: string | null;
  } | null;
};

export default function WorkoutSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // Edit state
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkout | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [isMoving, setIsMoving] = useState(false);


  useEffect(() => {
    if (user) {
      fetchScheduledWorkouts();
    }
  }, [user, currentDate]);

  // Real-time subscription — picks up entries written by Jarvis without a full reload
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('schedule_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scheduled_workouts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchScheduledWorkouts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
          workout_source,
          workout_title,
          estimated_duration_minutes,
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

  const openActions = (workout: ScheduledWorkout, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorkoutId(null);
    setActiveWorkout(workout);
    setShowDayPicker(false);
    setShowActionSheet(true);
  };

  const moveWorkout = async (newDate: Date) => {
    if (!activeWorkout) return;
    setIsMoving(true);
    try {
      const dateStr = newDate.toISOString().split('T')[0];
      const { error } = await supabase
        .from('scheduled_workouts')
        .update({ scheduled_date: dateStr })
        .eq('id', activeWorkout.id);
      if (error) throw error;
      setScheduledWorkouts(prev =>
        prev.map(w => w.id === activeWorkout.id ? { ...w, scheduled_date: dateStr } : w)
      );
      toast({ title: 'Moved', description: `Workout moved to ${format(newDate, 'EEE d MMM')}` });
      setShowActionSheet(false);
    } catch {
      toast({ variant: 'destructive', title: 'Could not move workout' });
    } finally {
      setIsMoving(false);
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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 pb-4" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 16px)" }}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Workout Schedule</h1>
        <Button size="sm" onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "I'd like to add a workout to my schedule" } }))} className="gap-1 h-8 px-3 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add
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

      <div className="p-4">
        <ScrollArea className="h-[calc(100vh-280px)]">
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
                      onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: `I'd like to add a workout for ${day}` } }))}
                    >
                      Add
                    </Button>
                  </div>
                  {dayWorkouts.length > 0 ? (
                    <div className="space-y-2">
                      {dayWorkouts.map(workout => {
                        const isSelected = selectedWorkoutId === workout.id
                        const startWorkout = () => {
                          if (workout.workout_source === 'ai_generated') {
                            navigate(`/gym-timer?scheduled_id=${workout.id}`)
                          } else if (workout.workout_id) {
                            navigate(`/workout-player/${workout.workout_id}`)
                          }
                        }
                        return (
                          <Card
                            key={workout.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              isSelected && "border-primary/50 bg-primary/8"
                            )}
                            onClick={() => setSelectedWorkoutId(prev => prev === workout.id ? null : workout.id)}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                {workout.workout?.thumbnail_url ? (
                                  <img src={workout.workout.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className={cn("w-full h-full flex items-center justify-center", isSelected && "bg-primary/10")}>
                                    <Dumbbell className={cn("w-6 h-6", isSelected ? "text-primary" : "text-muted-foreground")} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn("font-medium truncate", isSelected && "text-primary")}>{workout.workout_title ?? workout.workout?.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{(workout.estimated_duration_minutes ?? workout.workout?.duration_minutes) ?? '—'}min</span>
                                  {workout.workout?.category && <><span>·</span><span className="capitalize">{workout.workout.category}</span></>}
                                </div>
                              </div>
                              {isSelected && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-primary hover:bg-primary/10"
                                  onClick={(e) => { e.stopPropagation(); startWorkout() }}
                                >
                                  <Play className="w-4 h-4 fill-primary" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={(e) => openActions(workout, e)}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-3">No workouts scheduled</p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Action sheet — Move or Delete */}
      <Sheet open={showActionSheet} onOpenChange={setShowActionSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          {activeWorkout && (
            <div className="pt-2">
              <p className="font-semibold text-base mb-1 px-1">{activeWorkout.workout_title ?? activeWorkout.workout?.title}</p>
              <p className="text-xs text-muted-foreground px-1 mb-5">
                {format(parseISO(activeWorkout.scheduled_date), 'EEEE d MMMM')}
              </p>

              {!showDayPicker ? (
                <div className="space-y-2">
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:bg-secondary transition-colors text-left"
                    onClick={() => {
                      if (activeWorkout.workout_source === 'ai_generated') {
                        navigate(`/gym-timer?scheduled_id=${activeWorkout.id}`);
                      } else if (activeWorkout.workout_id) {
                        navigate(`/workout-player/${activeWorkout.workout_id}`);
                      }
                    }}
                  >
                    <Play className="w-5 h-5 text-primary" />
                    <span className="font-medium">Start now</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:bg-secondary transition-colors text-left"
                    onClick={() => setShowDayPicker(true)}
                  >
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <span className="font-medium">Move to a different day</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/10 active:bg-destructive/20 transition-colors text-left"
                    onClick={() => { deleteScheduledWorkout(activeWorkout.id); setShowActionSheet(false); }}
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <span className="font-medium text-destructive">Remove from schedule</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setShowDayPicker(false)} className="p-1">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <p className="text-sm font-medium">Choose a new day</p>
                  </div>
                  {/* Next 4 weeks of dates */}
                  <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                    {Array.from({ length: 28 }, (_, i) => addDays(new Date(), i + 1)).map(date => (
                      <button
                        key={date.toISOString()}
                        disabled={isMoving}
                        onClick={() => moveWorkout(date)}
                        className={cn(
                          'flex flex-col items-center py-3 rounded-2xl border-2 transition-all text-center',
                          isSameDay(date, parseISO(activeWorkout.scheduled_date))
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-secondary/30'
                        )}
                      >
                        <span className="text-xs text-muted-foreground">{format(date, 'EEE')}</span>
                        <span className="text-sm font-bold">{format(date, 'd')}</span>
                        <span className="text-[10px] text-muted-foreground">{format(date, 'MMM')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Empty State */}
      {scheduledWorkouts.length === 0 && !isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nothing scheduled yet.</h2>
          <p className="text-muted-foreground mb-6">Ask Jarvis to build you a plan or suggest today's workout.</p>
          <Button onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "Can you suggest a workout for me to schedule?" } }))} className="gap-2">
            Ask Jarvis
          </Button>
        </div>
      )}

      
    </div>
  );
}
