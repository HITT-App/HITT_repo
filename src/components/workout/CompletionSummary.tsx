import { useState, useRef, useCallback } from 'react';
import { X, Square, Smartphone, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import hiitLogo from '@/assets/hiit-watermark.png';

import type { Json } from '@/integrations/supabase/types';
import type { RoutePoint } from './ShareCardCanvas';

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
  pbLabel?: string;
  badges?: Array<{ name: string; icon: string }>;
  mapComponent?: React.ReactNode;
  routePositions?: RoutePoint[];
  onDone: () => void;
  postData?: Json;
  ratingSection?: React.ReactNode;
  mapContainerRef?: React.RefObject<HTMLDivElement>;
  pointsEarned?: number;
}

const C = {
  bg:          '#0a0a0a',
  panel:       '#141414',
  line:        '#262626',
  dim:         '#8c8c8c',
  cream:       '#f1ebdf',
  primary:     '#f97316',
  primaryDeep: '#ea580c',
};

const FONT_COND = "'Saira Condensed', 'Inter', sans-serif";
const FONT_UI   = "'Inter', -apple-system, sans-serif";

function getHeroMetrics(activityType: string | undefined, stats: CompletionStat[]): CompletionStat[] {
  const type = (activityType || '').toLowerCase();
  const find = (...kw: string[]) => stats.find(s => kw.some(k => s.label.toLowerCase().includes(k)));

  const duration  = find('duration', 'time');
  const calories  = find('calorie', 'kcal', 'cal');
  const distance  = find('distance', 'km', 'mile');
  const elevation = find('elevation', 'climb', 'ascent', 'gain');
  const exercises = find('exercise', 'set', 'rep', 'round', 'count');
  const laps      = find('lap', 'length');

  if (/run|cycl|walk|bike|hike|triath|route/.test(type)) {
    return [duration, distance, elevation].filter(Boolean) as CompletionStat[];
  }
  if (/swim|pool|aqua/.test(type)) {
    return [duration, laps || distance, calories].filter(Boolean) as CompletionStat[];
  }
  if (/strength|weight|hiit|aerob|box|martial|gym|circuit|crossfit/.test(type)) {
    return [duration, calories, exercises].filter(Boolean) as CompletionStat[];
  }
  const used = new Set([duration, calories]);
  const extra = stats.find(s => !used.has(s));
  return [duration, calories, extra].filter(Boolean) as CompletionStat[];
}

function GlowDivider({ width }: { width: number }) {
  return (
    <div style={{
      width, height: 3, borderRadius: 2, flexShrink: 0,
      background: 'linear-gradient(90deg, transparent, #f97316 22%, #fb923c 50%, #f97316 78%, transparent)',
      boxShadow: '0 0 14px rgba(249,115,22,0.55)',
    }} />
  );
}

function PulseLine({ width, height }: { width: number; height: number }) {
  const ys = [60,58,61,57,60,56,59,55,58,57,60,58,62,59,63,74,52,38,49,46,54,51,56,55,58,57,59];
  const W = 1000, H = 200, n = ys.length;
  const px = (i: number) => 30 + (i / (n - 1)) * (W - 60);
  const py = (v: number) => (v / 100) * H;
  let d = `M ${px(0).toFixed(1)} ${py(ys[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) d += ` L ${px(i).toFixed(1)} ${py(ys[i]).toFixed(1)}`;
  const ex = px(n - 1), ey = py(ys[n - 1]);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <filter id="sc-glow" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="sc-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f97316" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fb923c" />
          <stop offset="1" stopColor="#fdba74" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="#ea580c" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" filter="url(#sc-glow)" />
      <path d={d} fill="none" stroke="url(#sc-stroke)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r="16" fill="#fb923c" opacity="0.35" filter="url(#sc-glow)" />
      <circle cx={ex} cy={ey} r="8" fill="#fff" />
    </svg>
  );
}

function Metric({ stat, numSize, labelSize, align }: {
  stat: CompletionStat;
  numSize: number;
  labelSize: number;
  align: 'center' | 'left';
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center' }}>
      <span style={{ fontFamily: FONT_COND, fontWeight: 600, fontSize: labelSize, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, lineHeight: 1 }}>
        {stat.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: numSize * 0.04, marginTop: labelSize * 0.35 }}>
        <span style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: numSize, letterSpacing: '-0.01em', color: C.cream, lineHeight: 0.86 }}>
          {stat.value}
        </span>
        {stat.unit && (
          <span style={{ fontFamily: FONT_COND, fontWeight: 600, fontSize: numSize * 0.32, letterSpacing: '0.02em', textTransform: 'uppercase', color: C.primary, lineHeight: 1 }}>
            {stat.unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Creative({ format, activityTitle, heroMetrics, pbLabel, pointsEarned }: {
  format: 'square' | 'story';
  activityTitle: string;
  heroMetrics: CompletionStat[];
  pbLabel?: string;
  pointsEarned?: number;
}) {
  const square = format === 'square';
  const W = 1080, H = square ? 1080 : 1920;
  const align = square ? 'center' as const : 'left' as const;
  const items = square ? 'center' : 'flex-start';
  const contentW = square ? 560 : 820;
  const numSize = square ? 108 : 168;
  const labelSize = square ? 27 : 40;
  const padX = square ? 0 : 96;
  const hasPB = !!(pbLabel || (pointsEarned && pointsEarned > 0));

  return (
    <div style={{
      width: W, height: H, position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      background: 'radial-gradient(120% 70% at 50% 0%, #171310 0%, #0a0807 42%, #050505 100%)',
      display: 'flex', flexDirection: 'column', alignItems: items, justifyContent: 'center',
      padding: square ? '60px 0' : `0 ${padX}px`, fontFamily: FONT_COND,
    }}>
      {/* Brand frame */}
      <div style={{ position: 'absolute', top: 56, left: 56, right: 56, bottom: 56, border: '1px solid rgba(249,115,22,0.10)', borderRadius: 18, pointerEvents: 'none' }} />

      <div style={{ width: contentW, display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 46 : 60 }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 22 : 28 }}>
          <img
            src={hiitLogo}
            alt="HIIT"
            style={{ width: square ? 132 : 168, height: square ? 132 : 168, objectFit: 'contain', display: 'block', flexShrink: 0 }}
          />
          {!square && (
            <span style={{ fontFamily: FONT_COND, fontWeight: 600, fontSize: 32, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.primary, whiteSpace: 'nowrap' }}>
              WORKOUT COMPLETE
            </span>
          )}
          <span style={{ fontFamily: FONT_COND, fontWeight: 700, fontSize: square ? 32 : 62, letterSpacing: square ? '0.16em' : '0.02em', textTransform: 'uppercase', color: C.cream, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {activityTitle}
          </span>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 30 : 36, width: contentW }}>
          {heroMetrics.map((m, i) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 30 : 36, width: contentW }}>
              <Metric stat={m} align={align} numSize={numSize} labelSize={labelSize} />
              {i < heroMetrics.length - 1 && <GlowDivider width={contentW} />}
            </div>
          ))}
        </div>

        {/* Pulse line + story footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 0 : 42, width: contentW }}>
          <PulseLine width={contentW} height={square ? 104 : 150} />
          {!square && hasPB && (
            <span style={{ fontFamily: FONT_COND, fontWeight: 600, fontSize: 34, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.primary, whiteSpace: 'nowrap' }}>
              {pbLabel || 'Great Work'}{pointsEarned ? <> <span style={{ color: C.dim }}>·</span> +{pointsEarned} PTS</> : null}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FormatSeg({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 18px', borderRadius: 999,
      border: 'none', cursor: 'pointer', fontFamily: FONT_UI, fontSize: 13.5, fontWeight: 600,
      background: active ? '#2a2a2a' : 'transparent',
      color: active ? C.cream : C.dim,
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
      WebkitTapHighlightColor: 'transparent',
      transition: 'background 0.18s, color 0.18s',
    }}>
      {icon} {label}
    </button>
  );
}

export function CompletionSummary({
  activityTitle,
  activityType,
  stats,
  pbLabel,
  pointsEarned,
  onDone,
}: CompletionSummaryProps) {
  const [format, setFormat] = useState<'square' | 'story'>('square');
  const [isSharing, setIsSharing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  const heroMetrics = getHeroMetrics(activityType, stats);
  const square = format === 'square';
  const BASE_W = 1080, BASE_H = square ? 1080 : 1920;
  const previewW = Math.min(window.innerWidth * 0.85, 380);
  const scale = previewW / BASE_W;
  const previewH = BASE_H * scale;

  const handleShare = useCallback(async () => {
    if (isSharing || !captureRef.current) return;
    setIsSharing(true);
    const el = captureRef.current;
    try {
      // Un-scale for full-res capture
      el.style.transform = 'none';
      el.style.width = `${BASE_W}px`;
      el.style.height = `${BASE_H}px`;

      const canvas = await html2canvas(el, {
        width: BASE_W, height: BASE_H, scale: 1,
        useCORS: true, backgroundColor: C.bg, logging: false,
      });

      el.style.transform = '';
      el.style.width = '';
      el.style.height = '';

      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error('Could not create image'); setIsSharing(false); return; }
        const file = new File([blob], `hiit-${activityType || 'workout'}.png`, { type: 'image/png' });
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: `${activityTitle} — HIIT` });
          } else if (navigator.share) {
            await navigator.share({ title: activityTitle, text: heroMetrics.map(m => `${m.value}${m.unit ? ' ' + m.unit : ''} ${m.label}`).join(' · ') });
          } else {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/png');
            a.download = `hiit-${activityType || 'workout'}.png`;
            a.click();
          }
        } catch (shareErr) {
          if ((shareErr as Error)?.name !== 'AbortError') toast.error('Could not share');
        }
        onDone();
      }, 'image/png');
    } catch {
      el.style.transform = '';
      el.style.width = '';
      el.style.height = '';
      toast.error('Failed to prepare image');
    } finally {
      setIsSharing(false);
    }
  }, [activityTitle, activityType, heroMetrics, isSharing, BASE_W, BASE_H, onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: C.bg, fontFamily: FONT_UI }}
      onTouchStart={(e) => { dragStartY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (dragStartY.current === null) return;
        if (e.changedTouches[0].clientY - dragStartY.current > 80) onDone();
        dragStartY.current = null;
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(var(--safe-area-inset-top, 0px) + 18px) 20px 6px' }}>
        <button aria-label="Close" onClick={onDone} style={{ width: 38, height: 38, borderRadius: 999, border: 'none', cursor: 'pointer', background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
          <X size={18} color={C.dim} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 650, color: C.cream }}>Share workout</span>
        <div style={{ width: 38 }} />
      </div>

      {/* Format toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 999 }}>
          <FormatSeg active={square} onClick={() => setFormat('square')} label="Square" icon={<Square size={15} color={square ? C.cream : C.dim} strokeWidth={2.1} />} />
          <FormatSeg active={!square} onClick={() => setFormat('story')} label="Story" icon={<Smartphone size={15} color={!square ? C.cream : C.dim} strokeWidth={2.1} />} />
        </div>
      </div>

      {/* Creative preview */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, gap: 12, padding: '8px 0' }}>
        <div style={{
          width: previewW, height: previewH, borderRadius: 20, overflow: 'hidden', position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          transition: 'width 0.35s cubic-bezier(.4,0,.2,1), height 0.35s cubic-bezier(.4,0,.2,1)',
        }}>
          <div
            ref={captureRef}
            style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <Creative format={format} activityTitle={activityTitle} heroMetrics={heroMetrics} pbLabel={pbLabel} pointsEarned={pointsEarned} />
          </div>
        </div>
        <span style={{ fontSize: 12, color: '#6f6f6f', letterSpacing: '0.04em' }}>
          {square ? '1080 × 1080 · Feed post' : '1080 × 1920 · Story'}
        </span>
      </div>

      {/* Share button */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: `10px 24px calc(var(--safe-area-inset-bottom, 0px) + 28px)` }}>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className={cn('touch-manipulation')}
          style={{
            width: '100%', maxWidth: 360, height: 56, borderRadius: 16, border: 'none', cursor: isSharing ? 'default' : 'pointer',
            background: isSharing ? '#444' : `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`,
            color: '#1a0d04', fontFamily: FONT_UI, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: isSharing ? 'none' : '0 10px 26px rgba(249,115,22,0.42), 0 4px 10px rgba(0,0,0,0.4)',
            transition: 'background 0.15s, box-shadow 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Share2 size={19} color="#1a0d04" strokeWidth={2.2} />
          {isSharing ? 'Preparing…' : 'Share'}
        </button>
      </div>
    </div>
  );
}
