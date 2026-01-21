import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeartRateCardProps {
  bpm?: number;
  status?: string;
  data?: number[];
}

export function HeartRateCard({ bpm = 80, status = 'Within normal resting range', data = [65, 72, 68, 75, 80, 72, 68] }: HeartRateCardProps) {
  const navigate = useNavigate();
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold text-foreground">Heart Rate</span>
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-foreground">{bpm}bpm</span>
        <p className="text-sm text-muted-foreground mt-1">{status}</p>
      </div>

      {/* Simple line chart */}
      <div className="h-16 relative mb-2">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={`M 0 ${64 - ((data[0] - minVal) / range) * 50} ${data.map((val, i) => 
              `L ${(i / (data.length - 1)) * 100}% ${64 - ((val - minVal) / range) * 50}`
            ).join(' ')} L 100% 64 L 0 64 Z`}
            fill="url(#heartGradient)"
          />
          {/* Line */}
          <path
            d={`M 0 ${64 - ((data[0] - minVal) / range) * 50} ${data.map((val, i) => 
              `L ${(i / (data.length - 1)) * 100}% ${64 - ((val - minVal) / range) * 50}`
            ).join(' ')}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {/* Dots */}
          {data.map((val, i) => (
            <circle
              key={i}
              cx={`${(i / (data.length - 1)) * 100}%`}
              cy={64 - ((val - minVal) / range) * 50}
              r="3"
              fill="hsl(var(--primary))"
            />
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>

      <button 
        onClick={() => navigate('/heart-rate')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        View Details
      </button>
    </div>
  );
}
