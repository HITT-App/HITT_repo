import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Share2, Trophy, TrendingUp, Sparkles, Download, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

import type { Json } from '@/integrations/supabase/types';

export interface CompletionStat {
  label: string;
  value: string | number;
  unit?: string;
}

interface CompletionSummaryProps {
  activityTitle: string;
  activityType?: string;
  stats: CompletionStat[];
  achievementMessage?: string;
  badges?: Array<{ name: string; icon: string }>;
  mapComponent?: React.ReactNode;
  onDone: () => void;
  postData?: Json;
  ratingSection?: React.ReactNode;
}

export function CompletionSummary({
  activityTitle,
  activityType,
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  const handleGenerateImage = async () => {
    if (!user) {
      toast.error('Please log in to generate images');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-activity-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            activityType: activityType || activityTitle,
            stats,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error('Rate limit reached. Please try again in a moment.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits.');
        } else {
          toast.error(errData.error || 'Failed to generate image');
        }
        return;
      }

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        toast.success('Share image generated! ✨');
      }
    } catch {
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImageUrl) return;
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `hiit-${activityType || 'activity'}-${Date.now()}.png`;
    a.target = '_blank';
    a.click();
  };

  const handleDone = async () => {
    if (shareToFeed && user) {
      setIsPosting(true);
      try {
        const statsLine = stats
          .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ''} ${s.label.toLowerCase()}`)
          .join(' · ');

        await supabase.from('community_posts').insert([{
          user_id: user.id,
          content: `Just completed "${activityTitle}"! 💪 ${statsLine}`,
          post_type: 'workout',
          category: 'fitness',
          tags: ['workout', 'completed'],
          workout_data: postData ?? {},
          image_url: generatedImageUrl || null,
        }]);
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
      <div className="relative bg-gradient-to-b from-primary/20 to-background pt-14 pb-6 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3 animate-scale-in">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-0.5">{activityTitle}</h1>
        <p className="text-sm text-muted-foreground">Completed</p>
      </div>

      {/* Stats grid */}
      <div className="px-5 -mt-1">
        <div className={cn(
          "grid gap-2.5",
          stats.length <= 3 ? "grid-cols-3" : "grid-cols-2"
        )}>
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-3.5 text-center"
            >
              <p className="text-xl font-bold text-foreground leading-tight">
                {stat.value}
                {stat.unit && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {stat.unit}
                  </span>
                )}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement banner */}
      {(achievementMessage || badges.length > 0) && (
        <div className="px-5 mt-3">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3.5 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
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
        <div className="px-5 mt-3">
          <div className="rounded-2xl overflow-hidden border border-border h-[180px]">
            {mapComponent}
          </div>
        </div>
      )}

      {/* AI Share Image Generator — 1:1 square */}
      <div className="px-5 mt-3">
        {isGeneratingImage ? (
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="relative aspect-square bg-card">
              <Skeleton className="absolute inset-0 rounded-none" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-foreground font-medium">Creating your share image…</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 10-15 seconds</p>
                </div>
                {/* Animated progress dots */}
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        ) : generatedImageUrl ? (
          <div className="space-y-2">
            <div
              className="rounded-2xl border border-border overflow-hidden cursor-pointer relative group"
              onClick={() => setShowLightbox(true)}
            >
              <img
                src={generatedImageUrl}
                alt="AI generated activity share image"
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 active:bg-black/20 transition-colors flex items-center justify-center">
                <p className="text-transparent group-hover:text-white active:text-white text-sm font-medium transition-colors">
                  Tap to view full size
                </p>
              </div>
            </div>
            {/* Action buttons under the image */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 rounded-xl"
                onClick={handleDownloadImage}
              >
                <Download className="w-3.5 h-3.5" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 rounded-xl"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl gap-2.5 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={handleGenerateImage}
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-medium">Generate Share Image ✨</span>
          </Button>
        )}
      </div>

      {/* Rating section (optional) */}
      {ratingSection && (
        <div className="px-5 mt-3">
          {ratingSection}
        </div>
      )}

      {/* Share toggle + actions */}
      <div className="mt-auto px-5 pb-8 pt-5 space-y-3">
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-3.5">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Share to Feed</p>
              <p className="text-xs text-muted-foreground">
                {generatedImageUrl ? 'Post with your AI image' : 'Let friends see your achievement'}
              </p>
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

      {/* Lightbox */}
      {showLightbox && generatedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={generatedImageUrl}
            alt="AI generated activity share image"
            className="max-w-full max-h-[80vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage();
              }}
            >
              <Download className="w-4 h-4" />
              Save Image
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(false);
                handleGenerateImage();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              New Image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
