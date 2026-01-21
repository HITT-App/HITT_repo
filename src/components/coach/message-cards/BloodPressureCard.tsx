import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BloodPressureCardProps {
  systolic?: number;
  diastolic?: number;
  status?: string;
  data?: { systolic: number; diastolic: number }[];
}

export function BloodPressureCard({ 
  systolic = 120, 
  diastolic = 99,
  status = 'It is within normal range.',
  data = [
    { systolic: 118, diastolic: 78 },
    { systolic: 122, diastolic: 82 },
    { systolic: 120, diastolic: 80 },
    { systolic: 125, diastolic: 85 },
    { systolic: 119, diastolic: 79 },
    { systolic: 121, diastolic: 81 },
    { systolic: 120, diastolic: 80 },
    { systolic: 123, diastolic: 83 },
    { systolic: 118, diastolic: 78 },
    { systolic: 120, diastolic: 80 },
    { systolic: 122, diastolic: 82 },
    { systolic: 120, diastolic: 99 },
  ]
}: BloodPressureCardProps) {
  const navigate = useNavigate();
  const days = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold text-foreground">Blood Pressure</span>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-foreground">{systolic}/{diastolic}mmhg</span>
        <p className="text-sm text-muted-foreground mt-1">{status}</p>
      </div>

      {/* Chart */}
      <div className="h-16 relative mb-2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 64">
          {/* Systolic line */}
          <path
            d={`M ${data.map((d, i) => `${(i / (data.length - 1)) * 100} ${64 - ((d.systolic - 100) / 50) * 64}`).join(' L ')}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {/* Diastolic line */}
          <path
            d={`M ${data.map((d, i) => `${(i / (data.length - 1)) * 100} ${64 - ((d.diastolic - 60) / 50) * 64}`).join(' L ')}`}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span className="text-muted-foreground">Systolic</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-muted-foreground rounded" style={{ borderStyle: 'dashed' }} />
          <span className="text-muted-foreground">Diastolic</span>
        </div>
      </div>

      <button 
        onClick={() => navigate('/blood-pressure')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        See Blood Pressure
      </button>
    </div>
  );
}
