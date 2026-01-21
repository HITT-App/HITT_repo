import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SandowScoreCardProps {
  score?: number;
  status?: string;
  weeklyData?: number[];
}

export function SandowScoreCard({ 
  score = 87.2, 
  status = 'Very Fit & Healthy Muscle',
  weeklyData = [75, 82, 78, 85, 88, 84, 87]
}: SandowScoreCardProps) {
  const navigate = useNavigate();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxScore = Math.max(...weeklyData);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-semibold text-foreground">Sandow Score</span>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-foreground">{score}pts</span>
        <p className="text-sm text-muted-foreground mt-1">{status}</p>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-2 h-20 mb-2">
        {weeklyData.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-primary/20 rounded-t-sm relative overflow-hidden"
              style={{ height: `${(value / maxScore) * 100}%` }}
            >
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm"
                style={{ height: '100%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        {days.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <button 
        onClick={() => navigate('/health-metrics')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        See Sandow Score
      </button>
    </div>
  );
}
