import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Share2, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface CompletionStat {
  label: string;
  value: string | number;
  unit?: string;
}

interface CompletionSummaryProps {
  activityTitle: string;
  stats: CompletionStat[];
  achievementMessage?: string;
  badges?: Array<{ name: string; icon: string }>;
  mapComponent?: React.ReactNode;
  onDone: () => void;
  /** Extra workout_data to include in the community post */
  postData?: Record<string, unknown>;
  /** Rating section (optional, used by WorkoutPlayer) */
  ratingSection?: React.ReactNode;
}

export function CompletionSummary({
  activityTitle,
  stats,
  achievementMessage,
  badges = [],
  mapComponent,
  onDone,
  postData,
  ratingSection,
}: CompletionSummaryProps) {
  const { user } = useAuth();
  const [shareToFeed, setShareToFeed] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  const handleDone = async () => {
    if (shareToFeed && user) {
      setIsPosting(true);
      try {
        const statsLine = stats
          .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ''} ${s.label.toLowerCase()}`)
          .join(' · ');

        await supabase.from('community_posts').insert({
          user_id: user.id,
          content: `Just completed "${activityTitle}"! 💪 ${statsLine}`,
          post_type: 'workout',
          category: 'fitness',
          tags: ['workout', 'completed'],
          workout_data: postData ?? {},
        });
        toast.success('Shared to feed!');
      } catch {
        toast.error('Failed to share');
      } finally {
        setIsPosting(false);
      }
    }
    onDone();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Hero header */}
      <div className="relative bg-gradient-to-b from-primary/20 to-background pt-16 pb-8 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4 animate-scale-in">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">{activityTitle}</h1>
        <p className="text-sm text-muted-foreground">Completed</p>
      </div>

      {/* Stats grid */}
      <div className="px-6 -mt-2">
        <div className={cn(
          "grid gap-3",
          stats.length <= 3 ? "grid-cols-3" : "grid-cols-2"
        )}>
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-foreground">
                {stat.value}
                {stat.unit && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                )}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement banner */}
      {(achievementMessage || badges.length > 0) && (
        <div className="px-6 mt-4">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary shrink-0" />
            <div className="flex-1">
              {achievementMessage && (
                <p className="text-sm font-semibold text-foreground">{achievementMessage}</p>
              )}
              {badges.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  {badges.map((b, i) => (
                    <span key={i} className="text-lg" title={b.name}>{b.icon}</span>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {badges.length} badge{badges.length > 1 ? 's' : ''} earned!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map snapshot */}
      {mapComponent && (
        <div className="px-6 mt-4">
          <div className="rounded-2xl overflow-hidden border border-border h-[200px]">
            {mapComponent}
          </div>
        </div>
      )}

      {/* Rating section (optional) */}
      {ratingSection && (
        <div className="px-6 mt-4">
          {ratingSection}
        </div>
      )}

      {/* Share toggle + actions */}
      <div className="mt-auto px-6 pb-8 pt-6 space-y-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Share to Feed</p>
              <p className="text-xs text-muted-foreground">Let friends see your achievement</p>
            </div>
          </div>
          <Switch checked={shareToFeed} onCheckedChange={setShareToFeed} />
        </div>

        <Button
          className="w-full h-12 rounded-2xl text-base font-semibold"
          onClick={handleDone}
          disabled={isPosting}
        >
          {isPosting ? 'Sharing…' : shareToFeed ? 'Share & Done' : 'Done'}
        </Button>
      </div>
    </div>
  );
}
