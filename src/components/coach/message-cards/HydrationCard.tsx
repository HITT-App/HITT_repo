import { Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HydrationCardProps {
  current?: number;
  target?: number;
  glassesNeeded?: number;
}

export function HydrationCard({ current = 250, target = 2000, glassesNeeded = 4 }: HydrationCardProps) {
  const navigate = useNavigate();
  const totalGlasses = 8;
  const filledGlasses = Math.floor((current / target) * totalGlasses);

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Droplets className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-foreground">Hydration</span>
      </div>

      <div className="mb-3">
        <span className="text-2xl font-bold text-foreground">{current.toLocaleString()}/{target.toLocaleString()}ml</span>
        <p className="text-sm text-muted-foreground mt-1">
          You still need {Math.ceil((target - current) / 250)}50ml today.
        </p>
      </div>

      {/* Water glasses visualization */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: totalGlasses }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-8 rounded-md ${
              i < filledGlasses ? 'bg-blue-500' : 'bg-secondary'
            }`}
          />
        ))}
      </div>

      <button 
        onClick={() => navigate('/hydration')}
        className="w-full text-center text-sm text-primary font-medium hover:underline"
      >
        View Hydration
      </button>
    </div>
  );
}
