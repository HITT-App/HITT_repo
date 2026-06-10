import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Flame, Calendar, ChevronRight, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';

interface ScheduledWorkout {
  id: string;
  scheduled_date: string;
  status: string;
  workout_source: string;
  workout_title: string | null;
  estimated_duration_minutes: number | null;
  workout: {
    id: string;
    title: string;
    duration_minutes: number;
    calories_burned: number;
  } | null;
}

export function WorkoutPlanCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [todaysWorkout, setTodaysWorkout] = useState<ScheduledWorkout | null>(null);

  useEffect(() => {
    if (user) {
      fetchScheduledWorkouts();
    }
  }, [user]);

  const fetchScheduledWorkouts = async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);

    const { data } = await supabase
      .from('scheduled_workouts')
      .select(`
        id, scheduled_date, status, workout_source, workout_title, estimated_duration_minutes,
        workout:workouts (id, title, duration_minutes, calories_burned)
      `)
      .eq('user_id', user?.id)
      .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
      .order('scheduled_date');

    if (data) {
      // Type assertion to handle the join response
      const workouts = data as unknown as ScheduledWorkout[];
      setScheduledWorkouts(workouts);
      const today = workouts.find(w => 
        isSameDay(new Date(w.scheduled_date), new Date()) && w.status !== 'completed'
      );
      setTodaysWorkout(today || null);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    const scheduled = scheduledWorkouts.find(w => isSameDay(new Date(w.scheduled_date), date));
    return {
      day: format(date, 'EEE'),
      date,
      active: !!scheduled,
      completed: scheduled?.status === 'completed',
      isToday: isToday(date)
    };
  });

  return (
    <div className="px-3 sm:px-4 py-2">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-4 sm:p-5 text-white">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm opacity-90">This Week's Plan</p>
            <h3 className="text-lg sm:text-xl font-bold truncate">
              {todaysWorkout?.workout?.title || 'Your Workout Schedule'}
            </h3>
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-0 touch-manipulation flex-shrink-0 ml-2"
            onClick={() => todaysWorkout 
              ? (todaysWorkout.workout_source === 'ai_generated'
                  ? navigate(`/gym-timer?scheduled_id=${todaysWorkout.id}`)
                  : navigate(`/workout-player/${todaysWorkout.workout?.id}`))
              : navigate('/workout-library')
            }
          >
            <Play className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80" />
            <span className="text-xs sm:text-sm">
              {todaysWorkout?.workout?.duration_minutes || 30} min
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80" />
            <span className="text-xs sm:text-sm">
              ~{todaysWorkout?.workout?.calories_burned || 300} cal
            </span>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="flex justify-between mb-3 sm:mb-4 gap-1">
          {weekDays.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-0.5 sm:gap-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium transition-all touch-manipulation ${
                  item.completed
                    ? 'bg-white text-primary'
                    : item.active
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/50'
                } ${item.isToday ? 'ring-2 ring-white ring-offset-1 sm:ring-offset-2 ring-offset-primary' : ''}`}
              >
                {item.completed ? '✓' : item.day.charAt(0)}
              </div>
              <span className="text-[8px] sm:text-[10px] opacity-80">{item.day}</span>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-0 touch-manipulation text-xs sm:text-sm h-9 sm:h-10"
            onClick={() => navigate('/workout-schedule')}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Schedule
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-0 touch-manipulation text-xs sm:text-sm h-9 sm:h-10"
            onClick={() => navigate('/workout-library')}
          >
            <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> Browse
          </Button>
        </div>
      </div>
    </div>
  );
}
