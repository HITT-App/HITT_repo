import { Footprints, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StepsCardProps {
  steps?: number;
  change?: number;
  monthlyData?: number[];
}

export function StepsCard({ 
  steps = 1125, 
  change = 15,
  monthlyData = [600, 800, 550, 900, 1100, 950, 1125]
}: StepsCardProps) {
  const navigate = useNavigate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const maxSteps = Math.max(...monthlyData);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Footprints className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Steps</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-3xl font-bold text-foreground">{steps.toLocaleString()}steps</span>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500">+{change}% from last week</span>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="text-primary font-semibold">{(steps * 5).toLocaleString()}</span>
          <br />total
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1 h-16 mb-2">
        {monthlyData.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-primary rounded-t-sm"
              style={{ height: `${(value / maxSteps) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>

      <button 
        onClick={() => navigate('/steps')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        See All Insights
      </button>
    </div>
  );
}
