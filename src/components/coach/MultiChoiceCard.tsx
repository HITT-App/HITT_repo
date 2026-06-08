import { Button } from '@/components/ui/button';

export interface MultiChoiceOption {
  label: string;
  variant: 'primary' | 'outline' | 'ghost';
  onSelect: () => void;
}

interface MultiChoiceCardProps {
  icon: React.ReactNode;
  eyebrow: string;
  heading: string;
  subtext?: string;
  choices: MultiChoiceOption[];
}

export function MultiChoiceCard({ icon, eyebrow, heading, subtext, choices }: MultiChoiceCardProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3.5">
      <div className="flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-primary/[0.13] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-bold tracking-[0.13em] uppercase text-muted-foreground">{eyebrow}</p>
          <p className="text-base font-semibold tracking-tight mt-1.5 leading-tight">{heading}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtext}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-0.5">
        {choices.map((choice) => (
          <Button
            key={choice.label}
            variant={choice.variant === 'primary' ? 'default' : choice.variant}
            className={
              choice.variant === 'primary'
                ? 'h-11 rounded-xl bg-primary text-primary-foreground font-semibold'
                : choice.variant === 'outline'
                  ? 'h-11 rounded-xl text-foreground border-border font-medium'
                  : 'h-11 rounded-xl text-muted-foreground font-medium'
            }
            onClick={choice.onSelect}
          >
            {choice.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
