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
import {
  format, startOfWeek, addDays, isSameDay, parseISO,
  startOfMonth, endOfMonth, addMonths, getDaysInMonth, getDay,
} from 'date-fns';

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

  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // Edit state
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkout | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (user) fetchScheduledWorkouts();
  }, [user, currentDate, view]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('schedule_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scheduled_workouts',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchScheduledWorkouts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchScheduledWorkouts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let rangeStart: string, rangeEnd: string;
      if (view === 'week') {
        const ws = startOfWeek(currentDate);
        rangeStart = format(ws, 'yyyy-MM-dd');
        rangeEnd = format(addDays(ws, 6), 'yyyy-MM-dd');
      } else {
        rangeStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        rangeEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      }

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
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd)
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
      const { error } = await supabase.from('scheduled_workouts').delete().eq('id', id);
      if (error) throw error;
      setScheduledWorkouts(prev => prev.filter(w => w.id !== id));
      toast({ title: 'Workout removed from schedule' });
    } catch {
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

  const navigatePeriod = (dir: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(prev => addDays(prev, dir === 'next' ? 7 : -7));
    } else {
      setCurrentDate(prev => addMonths(prev, dir === 'next' ? 1 : -1));
      setSelectedDay(null);
    }
  };

  const getWorkoutsForDate = (date: Date) =>
    scheduledWorkouts.filter(w => isSameDay(parseISO(w.scheduled_date), date));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));

  // Month calendar helpers
  const monthStart = startOfMonth(currentDate);
  const firstDayOffset = (getDay(monthStart) + 6) % 7; // 0=Mon … 6=Sun
  const totalDays = getDaysInMonth(currentDate);
  const calendarCells = Array.from(
    { length: firstDayOffset + totalDays },
    (_, i) => i < firstDayOffset ? null : addDays(monthStart, i - firstDayOffset)
  );

  const WorkoutListItem = ({ workout }: { workout: ScheduledWorkout }) => {
    const isSelected = selectedWorkoutId === workout.id;
    const startWorkout = () => {
      if (workout.workout_source === 'ai_generated') {
        navigate(`/gym-timer?scheduled_id=${workout.id}`);
      } else if (workout.workout_id) {
        navigate(`/workout-player/${workout.workout_id}`);
      }
    };
    return (
      <Card
        className={cn('cursor-pointer transition-colors', isSelected && 'border-primary/50 bg-primary/8')}
        onClick={() => setSelectedWorkoutId(prev => prev === workout.id ? null : workout.id)}
      >
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
            {workout.workout?.thumbnail_url ? (
              <img src={workout.workout.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center', isSelected && 'bg-primary/10')}>
                <Dumbbell className={cn('w-6 h-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('font-medium truncate', isSelected && 'text-primary')}>
              {workout.workout_title ?? workout.workout?.title}
            </p>
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
              onClick={(e) => { e.stopPropagation(); startWorkout(); }}
            >
              <Play className="w-4 h-4 fill-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={(e) => openActions(workout, e)}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 pb-4"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 16px)' }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Workout Schedule</h1>
        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "I'd like to add a workout to my schedule" } }))}
          className="gap-1 h-8 px-3 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </header>

      {/* View toggle */}
      <div className="flex bg-secondary/50 rounded-xl p-1 mx-4 mt-3">
        <button
          className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', view === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
          onClick={() => setView('week')}
        >
          Week
        </button>
        <button
          className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', view === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground')}
          onClick={() => setView('month')}
        >
          Month
        </button>
      </div>

      {/* Period navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 mt-2">
        <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-medium text-sm">
          {view === 'week'
            ? `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'd MMM')}`
            : format(currentDate, 'MMMM yyyy')}
        </span>
        <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {view === 'week' ? (
        <>
          {/* Week day pills */}
          <div className="flex border-b border-border">
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, currentDate);
              const hasWorkouts = getWorkoutsForDate(day).length > 0;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentDate(day)}
                  className={cn('flex-1 py-3 text-center transition-all relative', isSelected && 'bg-primary/10')}
                >
                  <p className="text-xs text-muted-foreground">{format(day, 'EEE').slice(0, 2)}</p>
                  <p className={cn('text-lg font-semibold mt-1', isToday && 'text-primary')}>
                    {format(day, 'd')}
                  </p>
                  {hasWorkouts && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Weekly list */}
          <div className="p-4">
            <ScrollArea className="h-[calc(100vh-320px)]">
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
                          {dayWorkouts.map(w => <WorkoutListItem key={w.id} workout={w} />)}
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
        </>
      ) : (
        /* Month view */
        <div className="px-4 pt-3">
          {/* Day headers Mon–Sun */}
          <div className="grid grid-cols-7 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarCells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dayWorkouts = getWorkoutsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isDaySelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const hasWorkout = dayWorkouts.length > 0;
              const allDone = hasWorkout && dayWorkouts.every(w => w.status === 'completed');
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                  className="flex flex-col items-center py-1"
                >
                  <span className={cn(
                    'w-8 h-8 flex items-center justify-center text-sm rounded-full transition-colors',
                    isDaySelected && 'bg-primary text-primary-foreground font-semibold',
                    !isDaySelected && isToday && 'text-primary font-bold',
                    !isDaySelected && !isToday && 'text-foreground',
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasWorkout && (
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full mt-0.5',
                      allDone ? 'bg-green-500' : 'bg-primary'
                    )} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] text-muted-foreground">Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-muted-foreground">Completed</span>
            </div>
          </div>

          {/* Selected day workouts */}
          {selectedDay ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">{format(selectedDay, 'EEEE d MMMM')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: `I'd like to add a workout for ${format(selectedDay, 'EEEE d MMMM')}` } }))}
                >
                  Add
                </Button>
              </div>
              {getWorkoutsForDate(selectedDay).length > 0 ? (
                <div className="space-y-2">
                  {getWorkoutsForDate(selectedDay).map(w => <WorkoutListItem key={w.id} workout={w} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No workouts scheduled</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Tap a day to see workouts</p>
          )}
        </div>
      )}

      {/* Empty state — week view only */}
      {view === 'week' && scheduledWorkouts.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center mt-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-5">
            <Dumbbell className="w-9 h-9 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nothing scheduled yet.</h2>
          <p className="text-muted-foreground mb-6">Ask Jarvis to build you a plan or suggest today's workout.</p>
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "Can you suggest a workout for me to schedule?" } }))}
            className="gap-2"
          >
            Ask Jarvis
          </Button>
        </div>
      )}

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
    </div>
  );
}
