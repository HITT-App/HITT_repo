import { Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WeightCardProps {
  weight?: number;
  unit?: 'kg' | 'lb';
  bmi?: number;
  status?: string;
}

export function WeightCard({ 
  weight = 77, 
  unit = 'kg',
  bmi = 13.8,
  status = 'Normal Range'
}: WeightCardProps) {
  const navigate = useNavigate();

  // Calculate gauge position (assuming healthy range 18.5-24.9)
  const gaugeAngle = Math.min(Math.max((bmi / 30) * 180, 0), 180);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Weight</span>
      </div>

      {/* Gauge */}
      <div className="relative w-40 h-24 mx-auto mb-4">
        <svg viewBox="0 0 100 60" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 10 55 A 40 40 0 0 1 90 55"
            fill="none"
            stroke="url(#weightGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(gaugeAngle / 180) * 126} 126`}
          />
          <defs>
            <linearGradient id="weightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className="text-xs text-muted-foreground">{bmi} BMI</span>
        </div>
      </div>

      <div className="text-center">
        <span className="text-4xl font-bold text-foreground">{weight}{unit}</span>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-sm text-green-500">{status}</span>
          <span className="text-green-500">✓</span>
        </div>
      </div>

      <button 
        onClick={() => navigate('/weight')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        See Details
      </button>
    </div>
  );
}
