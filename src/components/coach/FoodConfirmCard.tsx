import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LogFoodPayload } from '@/hooks/useAI.types';

interface FoodConfirmCardProps {
  payload: LogFoodPayload;
  consumedToday?: number;
  dailyTarget?: number;
  onConfirm: () => void;
  onDismiss: () => void;
  isConfirming?: boolean;
}

export function FoodConfirmCard({
  payload,
  consumedToday,
  dailyTarget = 2100,
  onConfirm,
  onDismiss,
  isConfirming = false,
}: FoodConfirmCardProps) {
  const { name, calories, protein, carbs, fat, category } = payload;

  const newTotal = (consumedToday ?? 0) + calories;
  const ringPct = Math.min(1, newTotal / dailyTarget);
  const R = 26;
  const C = 2 * Math.PI * R;

  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const macroTotal = Math.max(1, pKcal + cKcal + fKcal);
  const macros: Array<{ label: string; grams: number; frac: number; color: string }> = [
    { label: 'Protein', grams: protein, frac: pKcal / macroTotal, color: 'hsl(var(--primary))' },
    { label: 'Carbs',   grams: carbs,   frac: cKcal / macroTotal, color: '#facc15' },
    { label: 'Fat',     grams: fat,     frac: fKcal / macroTotal, color: '#38bdf8' },
  ];

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3.5">
        <div className="relative w-16 h-16 shrink-0">
          <svg width="64" height="64" className="-rotate-90">
            <circle cx="32" cy="32" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="32" cy="32" r={R} fill="none"
              stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - ringPct)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[17px] font-bold tracking-tight">{calories}</span>
            <span className="text-[8.5px] font-semibold text-muted-foreground tracking-wider mt-0.5">KCAL</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold tracking-[0.13em] uppercase text-muted-foreground">Log to diary</p>
          <p className="text-base font-semibold tracking-tight mt-1 leading-tight truncate">{name}</p>
          {consumedToday !== undefined ? (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-primary font-semibold">{newTotal.toLocaleString()}</span> of{' '}
              {dailyTarget.toLocaleString()} kcal today
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 capitalize">{category}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {macros.map((m) => (
          <div key={m.label} className="flex items-center gap-2.5">
            <span className="w-[54px] text-[11.5px] text-muted-foreground font-medium">{m.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${m.frac * 100}%`, background: m.color }} />
            </div>
            <span className="w-[30px] text-right text-[11.5px] font-semibold">{m.grams}g</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-0.5">
        <Button
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to diary'}
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5 text-muted-foreground border-border"
          onClick={onDismiss}
          disabled={isConfirming}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
