import { Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SetGoalsPayload } from '@/hooks/useAI.types';

interface GoalConfirmCardProps {
  payload: SetGoalsPayload;
  onConfirm: () => void;
  onDismiss: () => void;
  isConfirming?: boolean;
}

export function GoalConfirmCard({
  payload,
  onConfirm,
  onDismiss,
  isConfirming = false,
}: GoalConfirmCardProps) {
  const { target_text, target_date } = payload;

  let dateLabel = '';
  let weeksLabel = '';
  if (target_date) {
    const target = new Date(`${target_date}T00:00:00`);
    if (!Number.isNaN(target.getTime())) {
      dateLabel = target.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const weeks = Math.max(1, Math.round((target.getTime() - Date.now()) / (7 * 864e5)));
      weeksLabel = `${weeks} wk${weeks === 1 ? '' : 's'}`;
    }
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3.5">
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-primary/[0.13] flex items-center justify-center shrink-0">
          <Target className="w-6 h-6 text-primary" strokeWidth={2.1} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold tracking-[0.13em] uppercase text-muted-foreground">Set a goal</p>
          <p className="text-base font-semibold tracking-tight mt-1.5 leading-tight">{target_text}</p>
        </div>
      </div>

      {target_date && dateLabel && (
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>Today</span>
            <span className="text-primary font-semibold">
              {dateLabel}{weeksLabel ? ` · ${weeksLabel}` : ''}
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-secondary">
            <div className="absolute left-0 top-0 h-full w-[14%] rounded-full bg-primary" />
            <div className="absolute left-[14%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary ring-[3px] ring-card" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-card border-2 border-muted-foreground" />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-0.5">
        <Button
          className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save goal'}
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
