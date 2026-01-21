import { Moon, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SleepStage {
  name: string;
  hours: number;
  color: string;
}

interface SleepCardProps {
  totalHours?: number;
  date?: string;
  stages?: SleepStage[];
}

export function SleepCard({ 
  totalHours = 7.2, 
  date = 'Jun 3, 2026',
  stages = [
    { name: 'REM', hours: 4, color: 'bg-purple-500' },
    { name: 'Deep', hours: 3, color: 'bg-blue-500' },
    { name: 'Light', hours: 1.2, color: 'bg-cyan-400' },
    { name: 'Wake Up', hours: 0.5, color: 'bg-yellow-400' },
  ]
}: SleepCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-foreground">Sleep</span>
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-foreground">{totalHours}h Total</span>
      </div>

      {/* Sleep timeline */}
      <div className="h-8 flex rounded-lg overflow-hidden mb-4">
        {stages.map((stage, i) => (
          <div 
            key={i}
            className={`${stage.color} flex items-center justify-center`}
            style={{ width: `${(stage.hours / totalHours) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {stages.map((stage, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
            <span className="text-muted-foreground">{stage.name}</span>
            <span className="text-foreground font-medium ml-auto">{stage.hours} hour</span>
          </div>
        ))}
      </div>

      <button 
        onClick={() => navigate('/sleep')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        See Sleep
      </button>
    </div>
  );
}
