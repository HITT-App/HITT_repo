import { useState, useRef } from "react";
import { REACTION_EMOJIS, ReactionType } from "@/hooks/useReactions";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Heart } from "lucide-react";

interface ReactionPickerProps {
  userReaction: ReactionType | null;
  counts: Partial<Record<ReactionType, number>>;
  total: number;
  onReact: (type: ReactionType) => void;
  disabled?: boolean;
  formatNumber: (n: number) => string;
}

const REACTION_LIST: ReactionType[] = ['heart', 'laugh', 'wow', 'fire', 'muscle', 'clap'];

export const ReactionPicker = ({
  userReaction,
  counts,
  total,
  onReact,
  disabled,
  formatNumber,
}: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      setOpen(true);
    }, 400);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleQuickTap = () => {
    if (!open) {
      onReact('heart');
    }
  };

  const handleSelectReaction = (type: ReactionType) => {
    onReact(type);
    setOpen(false);
  };

  // Top 3 reactions for display
  const topReactions = Object.entries(counts)
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .slice(0, 3)
    .filter(([, count]) => (count || 0) > 0);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-full transition-all touch-manipulation",
              userReaction
                ? "text-red-500 bg-red-500/8"
                : "text-muted-foreground hover:bg-secondary/60"
            )}
            onClick={handleQuickTap}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={disabled}
          >
            {userReaction ? (
              <span className="text-base leading-none">{REACTION_EMOJIS[userReaction]}</span>
            ) : (
              <Heart className="w-[18px] h-[18px]" />
            )}
            <span className="text-xs font-semibold">{formatNumber(total)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-auto p-1.5 rounded-full border border-border/60 bg-card shadow-lg"
        >
          <div className="flex items-center gap-0.5">
            {REACTION_LIST.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectReaction(type)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-95 touch-manipulation",
                  userReaction === type && "bg-primary/10 ring-2 ring-primary/30"
                )}
              >
                {REACTION_EMOJIS[type]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Grouped reaction emojis — only when there are 2+ distinct
          reaction types. With a single reaction type, the main button
          already shows that emoji + count, so a solo strip beside it
          just renders the same heart twice. */}
      {topReactions.length > 1 && total > 0 && (
        <div className="flex items-center -ml-1">
          {topReactions.map(([type]) => (
            <span key={type} className="text-xs leading-none -ml-0.5">
              {REACTION_EMOJIS[type as ReactionType]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
