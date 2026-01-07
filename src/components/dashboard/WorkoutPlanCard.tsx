import { useNavigate } from 'react-router-dom';
import { Play, Clock, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

const workoutDays = [
  { day: 'Mon', active: true, completed: true },
  { day: 'Tue', active: true, completed: true },
  { day: 'Wed', active: true, completed: false },
  { day: 'Thu', active: false, completed: false },
  { day: 'Fri', active: true, completed: false },
  { day: 'Sat', active: false, completed: false },
  { day: 'Sun', active: false, completed: false },
];

export function WorkoutPlanCard() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-2">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">This Week's Plan</p>
            <h3 className="text-xl font-bold">Muscle Building</h3>
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/20 hover:bg-white/30 text-white border-0"
            onClick={() => navigate('/workouts')}
          >
            <Play className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 opacity-80" />
            <span className="text-sm">45 min/day</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 opacity-80" />
            <span className="text-sm">~400 cal</span>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="flex justify-between">
          {workoutDays.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  item.completed
                    ? 'bg-white text-primary'
                    : item.active
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {item.completed ? '✓' : item.day.charAt(0)}
              </div>
              <span className="text-[10px] opacity-80">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
