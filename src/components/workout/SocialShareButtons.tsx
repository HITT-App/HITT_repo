import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  imageUrl: string | null;
  activityTitle: string;
  statsText: string;
}

const PLATFORMS = [
  {
    name: 'WhatsApp',
    icon: '💬',
    color: 'bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366]',
    share: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-[#1877F2]/15 hover:bg-[#1877F2]/25 text-[#1877F2]',
    share: (text: string) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
  },
  {
    name: 'X',
    icon: '𝕏',
    color: 'bg-foreground/10 hover:bg-foreground/20 text-foreground',
    share: (text: string) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
  },
  {
    name: 'Instagram',
    icon: '📷',
    color: 'bg-[#E4405F]/15 hover:bg-[#E4405F]/25 text-[#E4405F]',
    share: null, // Instagram doesn't support URL-based sharing — download prompt
  },
  {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-foreground/10 hover:bg-foreground/20 text-foreground',
    share: null, // TikTok requires app — download prompt
  },
];

export function SocialShareButtons({ imageUrl, activityTitle, statsText }: SocialShareButtonsProps) {
  const shareText = `Just completed "${activityTitle}"! 💪 ${statsText} #HIIT #Fitness`;

  const handleNativeShare = async () => {
    if (!navigator.share) {
      // Fallback: copy text to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Share text copied to clipboard! 📋');
      } catch {
        toast.info('Copy this text to share: ' + shareText);
      }
      return;
    }

    try {
      const shareData: ShareData = { title: activityTitle, text: shareText };

      // Try sharing with image if available
      if (imageUrl && navigator.canShare) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const file = new File([blob], `hiit-${Date.now()}.png`, { type: 'image/png' });
          const withFile = { ...shareData, files: [file] };
          if (navigator.canShare(withFile)) {
            await navigator.share(withFile);
            return;
          }
        } catch {
          // Fall through to text-only share
        }
      }

      await navigator.share(shareData);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Share text copied to clipboard! 📋');
        } catch {
          toast.error('Could not share');
        }
      }
    }
  };

  const handlePlatformShare = (platform: typeof PLATFORMS[number]) => {
    if (platform.share) {
      window.open(platform.share(shareText), '_blank', 'noopener,noreferrer');
    } else {
      // For Instagram/TikTok — prompt to save image first
      if (imageUrl) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `hiit-${Date.now()}.png`;
        a.click();
        toast.success(`Image saved! Open ${platform.name} and share from your gallery 📱`);
      } else {
        toast.info(`Save your share image first, then upload it to ${platform.name}`);
      }
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Share to</p>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Native share button (mobile-first) */}
        {'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 active:bg-primary/30 transition-colors min-w-[56px]"
          >
            <Share2 className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-medium text-primary">More</span>
          </button>
        )}

        {PLATFORMS.map((p) => (
          <button
            key={p.name}
            onClick={() => handlePlatformShare(p)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl active:scale-95 transition-all min-w-[56px] ${p.color}`}
          >
            <span className="text-lg leading-none">{p.icon}</span>
            <span className="text-[10px] font-medium">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
