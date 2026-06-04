import { Map, BarChart3, Sparkles, Camera, Layers, Smartphone, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShareStyle = 'none' | 'map' | 'stats' | 'ai' | 'photo' | 'transparent' | 'story' | 'template';

interface ShareOptionsGridProps {
  hasMap: boolean;
  onSelect: (style: ShareStyle) => void;
  isGenerating: boolean;
}

const getOptions = (hasMap: boolean) => [
  {
    key: 'map' as const,
    icon: Map,
    label: 'Map Card',
    desc: 'Route + stats overlay',
    badge: 'Instant',
    needsMap: true,
  },
  {
    key: 'stats' as const,
    icon: BarChart3,
    label: 'Stats Card',
    desc: hasMap ? 'Route + stats' : 'Dark branded card',
    badge: 'Instant',
    needsMap: false,
  },
  {
    key: 'transparent' as const,
    icon: Layers,
    label: 'Transparent',
    desc: 'Layer over your photos',
    badge: 'Instant',
    needsMap: false,
  },
  {
    key: 'story' as const,
    icon: Smartphone,
    label: 'Story Card',
    desc: 'Instagram / TikTok',
    badge: 'Instant',
    needsMap: false,
  },
  {
    key: 'ai' as const,
    icon: Sparkles,
    label: 'AI Cinematic',
    desc: 'Premium AI scene',
    badge: '~15s',
    needsMap: false,
  },
  {
    key: 'photo' as const,
    icon: Camera,
    label: 'Quick Photo',
    desc: 'Your photo + stats',
    badge: 'Instant',
    needsMap: false,
  },
  {
    key: 'template' as const,
    icon: LayoutTemplate,
    label: 'Templates',
    desc: '6 branded designs',
    badge: 'New',
    needsMap: false,
  },
];

export function ShareOptionsGrid({ hasMap, onSelect, isGenerating }: ShareOptionsGridProps) {
  const visible = getOptions(hasMap).filter((o) => !o.needsMap || hasMap);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground text-center">Create Share Image</p>
      <div className={cn('grid gap-2', visible.length >= 4 ? 'grid-cols-2' : 'grid-cols-2')}>
        {visible.map((opt) => (
          <button
            key={opt.key}
            disabled={isGenerating}
            onClick={() => onSelect(opt.key)}
            className="relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border border-border bg-card hover:bg-secondary/50 active:bg-secondary transition-colors disabled:opacity-50"
          >
            <opt.icon className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">{opt.label}</span>
            <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
            <span
              className={cn(
                'absolute top-2 right-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
                opt.badge === 'Instant'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-accent text-accent-foreground'
              )}
            >
              {opt.badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
