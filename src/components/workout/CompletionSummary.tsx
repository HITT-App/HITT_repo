import { useState, useCallback, useRef } from 'react';
import { X, Square, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import type { Json } from '@/integrations/supabase/types';
import type { RoutePoint } from './ShareCardCanvas';
import { ActivityShareCard } from './ActivityShareCard';
import { generateActivityShareCardBlob } from '@/lib/generate-activity-share-card';
import { CompletionIntro } from './CompletionIntro';

export interface CompletionStat {
  label: string;
  value: string | number;
  unit?: string;
}

// Extract raw metric values from a formatted CompletionStat array. The new
// share card needs raw seconds / km / bpm, but callers pass pre-formatted
// display strings — so we parse them back best-effort. Anything unparseable
// falls through as undefined and the card renders "—" for that metric.
function parseStatsForShareCard(stats: CompletionStat[]): {
  durationSeconds?: number;
  calories?: number;
  distanceKm?: number;
  avgHR?: number;
  volumeKg?: number;
  exerciseCount?: number;
} {
  const out: ReturnType<typeof parseStatsForShareCard> = {};
  for (const s of stats) {
    const label = s.label.toLowerCase();
    const raw = String(s.value).trim();
    if (/duration|time/.test(label)) {
      // "1 hr 30 min 20 sec" | "24 min" | "5:23" | "1:02:30"
      let sec = 0;
      const h = raw.match(/(\d+)\s*(?:hr|hour|h)/i); if (h) sec += parseInt(h[1], 10) * 3600;
      const m = raw.match(/(\d+)\s*(?:min|m)\b/i);   if (m) sec += parseInt(m[1], 10) * 60;
      const s2 = raw.match(/(\d+)\s*(?:sec|s)\b/i);  if (s2) sec += parseInt(s2[1], 10);
      if (sec === 0 && /^\d+:\d+/.test(raw)) {
        const parts = raw.split(':').map((p) => parseInt(p, 10));
        if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
      }
      if (sec > 0) out.durationSeconds = sec;
    } else if (/calor|kcal/.test(label)) {
      const n = parseFloat(raw.replace(/[,\s]/g, ''));
      if (Number.isFinite(n)) out.calories = n;
    } else if (/distance/.test(label)) {
      const n = parseFloat(raw);
      if (Number.isFinite(n)) {
        // Assume metres if unit is 'm' (swim), km otherwise.
        out.distanceKm = (s.unit ?? '').toLowerCase() === 'm' ? n / 1000 : n;
      }
    } else if (/hr|heart/.test(label)) {
      const n = parseFloat(raw);
      if (Number.isFinite(n)) out.avgHR = n;
    } else if (/volume/.test(label)) {
      const n = parseFloat(raw.replace(/[,\s]/g, ''));
      if (Number.isFinite(n)) out.volumeKg = n;
    } else if (/exercis/.test(label)) {
      const n = parseFloat(raw);
      if (Number.isFinite(n)) out.exerciseCount = n;
    }
  }
  return out;
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
  dark:        '#171717',
  primary:     '#f97316',
  primaryDeep: '#ea580c',
};

type Sport = 'run' | 'swim' | 'gym' | 'tri';
type CardStyle = 'dark' | 'photo';

function detectSport(activityType?: string): Sport {
  const t = (activityType || '').toLowerCase();
  if (/triath/.test(t)) return 'tri';
  if (/run|jog|walk|cycl|bike|hike|route|outdoor|cardio/.test(t)) return 'run';
  if (/swim|pool|aqua/.test(t)) return 'swim';
  return 'gym';
}

// Sport-specific trace data — directly from the design spec
const TRACES: Record<Sport, number[]> = {
  run:  [62,62,61,62,60,61,59,60,57,59,56,57,54,55,52,50,48,49,46,44,42,43,41,57,24,46,38,48,42,47,51,54,57,59,60,61,60,61,60,61],
  swim: [56,48,60,45,58,44,57,46,59,45,56,47,58,44,57,46,59,45,57,47,58,45,57,46,58,46,57,46,58],
  gym:  [58,57,58,57,58,38,68,58,57,58,57,35,70,58,57,58,57,40,66,58,57,58,57,37,69,58,57,58,57],
  tri:  [64,63,62,60,61,58,40,56,54,52,53,50,68,48,46,47,44,60,42,52,50,51,48,46,58,50,56,53,58],
};

const FONT_COND = "'Saira Condensed', 'Inter', sans-serif";
const FONT_UI   = "'Inter', -apple-system, sans-serif";

function buildShareText(sport: Sport, activityTitle: string, heroMetrics: CompletionStat[]): string {
  const find = (...kw: string[]) => heroMetrics.find(s => kw.some(k => s.label.toLowerCase().includes(k)));
  const fmt = (s: CompletionStat | undefined) => s ? `${s.value}${s.unit ? ' ' + s.unit : ''}` : null;

  const time = fmt(find('duration', 'time'));
  const dist = fmt(find('distance', 'km', 'mile'));
  const cals = fmt(find('calorie', 'kcal'));

  if (sport === 'run') {
    if (dist && time) return `Just completed ${activityTitle} — ${dist} in ${time} 🏃 #HIIT`;
    if (time) return `Just completed ${activityTitle} in ${time} 🏃 #HIIT`;
  }
  if (sport === 'swim') {
    const laps = fmt(find('lap', 'length'));
    if (laps && time) return `Hit the pool — ${laps} laps in ${time} 🏊 #HIIT`;
    if (time) return `Swim session done — ${time} in the water 🏊 #HIIT`;
  }
  if (sport === 'tri') {
    if (time) return `Triathlon complete — ${time} total 🏅 #HIIT`;
  }
  if (cals && time) return `${activityTitle} done — ${cals} burned in ${time} 💪 #HIIT`;
  if (time) return `${activityTitle} complete — ${time} 💪 #HIIT`;
  return `${activityTitle} complete 💪 #HIIT`;
}

function getHeroMetrics(activityType: string | undefined, stats: CompletionStat[]): CompletionStat[] {
  const type = (activityType || '').toLowerCase();
  const find = (...kw: string[]) => stats.find(s => kw.some(k => s.label.toLowerCase().includes(k)));

  const duration  = find('duration', 'time');
  const calories  = find('calorie', 'kcal', 'cal');
  const distance  = find('distance', 'km', 'mile');
  const elevation = find('elevation', 'climb', 'ascent', 'gain');
  const pace      = find('pace', 'min/km');
  const exercises = find('exercise', 'set', 'rep', 'round', 'count');
  const laps      = find('lap', 'length');

  if (/triath/.test(type)) {
    return [duration, distance, pace || calories].filter(Boolean) as CompletionStat[];
  }
  if (/run|cycl|walk|bike|hike|route/.test(type)) {
    return [duration, distance, pace || elevation].filter(Boolean) as CompletionStat[];
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
      margin: '6px 0',
      background: 'linear-gradient(90deg, transparent, #f97316 22%, #fb923c 50%, #f97316 78%, transparent)',
      boxShadow: '0 0 14px rgba(249,115,22,0.55)',
    }} />
  );
}

function SportTrace({ sport, width, height }: { sport: Sport; width: number; height: number }) {
  const ys = TRACES[sport];
  const W = 1000, H = 200, n = ys.length;
  const px = (i: number) => 16 + (i / (n - 1)) * (W - 32);
  const py = (v: number) => (v / 100) * H;
  let d = `M ${px(0).toFixed(1)} ${py(ys[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) d += ` L ${px(i).toFixed(1)} ${py(ys[i]).toFixed(1)}`;
  const ni = Math.round((n - 1) * 0.82);
  const nx = px(ni), ny = py(ys[ni]);
  const fade = 'linear-gradient(90deg, transparent 0%, #000 17%, #000 83%, transparent 100%)';
  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible', WebkitMaskImage: fade, maskImage: fade }}
    >
      <defs>
        <filter id="sc-glow" x="-20%" y="-90%" width="140%" height="280%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="sc-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0"    stopColor="#d65a12" />
          <stop offset="0.2"  stopColor="#ff7d2a" />
          <stop offset="0.45" stopColor="#ffab4e" />
          <stop offset="0.62" stopColor="#ffe7ac" />
          <stop offset="0.8"  stopColor="#ff8f3a" />
          <stop offset="1"    stopColor="#e0600f" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="#e0600f" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.42" filter="url(#sc-glow)" />
      <path d={d} fill="none" stroke="url(#sc-stroke)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={nx} cy={ny} r="11" fill="#ffc98a" opacity="0.4" filter="url(#sc-glow)" />
      <circle cx={nx} cy={ny} r="4.5" fill="#fff7ef" />
    </svg>
  );
}

function Metric({ stat, numSize, labelSize, align, valueColor, textShadow }: {
  stat: CompletionStat;
  numSize: number;
  labelSize: number;
  align: 'center' | 'left';
  valueColor: string;
  textShadow: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'left' ? 'flex-start' : 'center' }}>
      <span style={{
        fontFamily: FONT_COND, fontWeight: 600, fontSize: labelSize,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primary,
        lineHeight: 1, textShadow,
      }}>
        {stat.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: numSize * 0.04, marginTop: labelSize * 0.35 }}>
        <span style={{
          fontFamily: FONT_COND, fontWeight: 700, fontSize: numSize,
          letterSpacing: '-0.01em', color: valueColor, lineHeight: 1, textShadow,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {stat.value}
        </span>
        {stat.unit && (
          <span style={{
            fontFamily: FONT_COND, fontWeight: 600, fontSize: numSize * 0.32,
            letterSpacing: '0.02em', textTransform: 'uppercase', color: C.primary,
            lineHeight: 1, textShadow,
          }}>
            {stat.unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Creative({ format, cardStyle, photoDataUrl, heroMetrics, sport, pbLabel, pointsEarned }: {
  format: 'square' | 'story';
  cardStyle: CardStyle;
  photoDataUrl: string | null;
  heroMetrics: CompletionStat[];
  sport: Sport;
  pbLabel?: string;
  pointsEarned?: number;
}) {
  const square = format === 'square';
  const photo  = cardStyle === 'photo';
  const W = 1080, H = square ? 1080 : 1920;
  const align    = square ? 'center' as const : 'left' as const;
  const items    = square ? 'center' : 'flex-start';
  const contentW = square ? 560 : 820;
  const numSize  = square ? 108 : 168;
  const labelSize = square ? 27 : 40;
  const padX     = square ? 0 : 96;
  const hasPB    = !!(pbLabel || (pointsEarned && pointsEarned > 0));

  const valueColor = photo ? C.dark  : C.cream;
  const textShadow = photo
    ? '0 2px 26px rgba(255,255,255,0.65), 0 0 2px rgba(255,255,255,0.6)'
    : 'none';

  const bgStyle: React.CSSProperties = photo
    ? photoDataUrl
      ? { backgroundImage: `url("${photoDataUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: 'transparent' }
    : { background: 'radial-gradient(120% 70% at 50% 0%, #171310 0%, #0a0807 42%, #050505 100%)' };

  return (
    <div style={{
      width: W, height: H, position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', alignItems: items, justifyContent: 'center',
      padding: square ? '60px 0' : `0 ${padX}px`, fontFamily: FONT_COND,
      ...bgStyle,
    }}>
      {/* Brand frame */}
      <div style={{
        position: 'absolute', top: 56, left: 56, right: 56, bottom: 56,
        border: '1px solid rgba(249,115,22,0.10)', borderRadius: 18, pointerEvents: 'none',
      }} />

      <div style={{ width: contentW, display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 46 : 60 }}>
        {/* Logo */}
        <img
          src={hiitLogo}
          alt="HIIT"
          style={{
            width: square ? 132 : 168, height: square ? 132 : 168,
            objectFit: 'contain', display: 'block', flexShrink: 0,
            filter: photo ? 'none' : 'drop-shadow(0 0 10px rgba(239,106,26,0.45))',
          }}
        />

        {/* Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 30 : 36, width: contentW }}>
          {heroMetrics.map((m, i) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 30 : 36, width: contentW }}>
              <Metric stat={m} align={align} numSize={numSize} labelSize={labelSize} valueColor={valueColor} textShadow={textShadow} />
              {i < heroMetrics.length - 1 && <GlowDivider width={contentW} />}
            </div>
          ))}
        </div>

        {/* Sport-specific trace + story footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: square ? 0 : 42, width: contentW }}>
          <SportTrace sport={sport} width={contentW} height={square ? 104 : 150} />
          {!square && hasPB && (
            <span style={{
              fontFamily: FONT_COND, fontWeight: 600, fontSize: 34,
              letterSpacing: '0.16em', textTransform: 'uppercase', color: C.primary,
              whiteSpace: 'nowrap', textShadow,
            }}>
              {pbLabel || 'Great Work'}{pointsEarned ? <> <span style={{ color: C.dim }}>·</span> +{pointsEarned} PTS</> : null}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlSeg({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 999,
      border: 'none', cursor: 'pointer', fontFamily: FONT_UI, fontSize: 13.5, fontWeight: 600,
      background: active ? '#2a2a2a' : 'transparent',
      color: active ? C.cream : C.dim,
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
      WebkitTapHighlightColor: 'transparent',
      transition: 'background 0.18s, color 0.18s',
      whiteSpace: 'nowrap',
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
  // Hooks — must all run every render. Do NOT put an early return above
  // these; React errors 300/310 fire the moment a hook's call order shifts
  // between renders.
  const [format, setFormat]       = useState<'square' | 'story'>('square');
  const [isSharing, setIsSharing] = useState(false);
  // Play the HITT-hero celebratory flash on first mount, then reveal the
  // share screen. Callers get this behaviour automatically — no per-page
  // wiring needed.
  const [introDone, setIntroDone] = useState(false);
  const dragStartY  = useRef<number | null>(null);

  // Derived values — cheap, safe to compute every render. They feed the
  // callback below, which must be declared as a hook before any early return.
  const heroMetrics = getHeroMetrics(activityType, stats);
  const parsed = parseStatsForShareCard(stats);
  const shareData: React.ComponentProps<typeof ActivityShareCard>['data'] = {
    activityType: activityType ?? 'workout',
    durationSeconds: parsed.durationSeconds ?? 0,
    calories: parsed.calories ?? null,
    distanceKm: parsed.distanceKm ?? null,
    avgHR: parsed.avgHR ?? null,
    volumeKg: parsed.volumeKg ?? null,
    exerciseCount: parsed.exerciseCount ?? null,
  };

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    const sport = detectSport(activityType);
    try {
      const blob = await generateActivityShareCardBlob({
        data: shareData,
        format,
      });
      const file = new File([blob], `hiit-${activityType || 'workout'}.png`, { type: 'image/png' });
      const shareText = buildShareText(sport, activityTitle, heroMetrics);
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: activityTitle, text: shareText });
        } else if (navigator.share) {
          await navigator.share({ title: activityTitle, text: shareText });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      } catch (shareErr) {
        if ((shareErr as Error)?.name !== 'AbortError') toast.error('Could not share');
      }
      onDone();
    } catch {
      toast.error('Failed to prepare image');
    } finally {
      setIsSharing(false);
    }
  }, [activityTitle, activityType, heroMetrics, isSharing, shareData, format, onDone]);

  // Early return AFTER all hooks. Rules of hooks: consistent call order.
  if (!introDone) {
    return <CompletionIntro onComplete={() => setIntroDone(true)} />;
  }

  const square    = format === 'square';
  const BASE_W    = 1080, BASE_H = square ? 1080 : 1920;
  const previewW  = Math.min(window.innerWidth * 0.85, 380);
  const scale     = previewW / BASE_W;
  const previewH  = BASE_H * scale;

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
        <button
          aria-label="Close"
          onClick={onDone}
          style={{ width: 38, height: 38, borderRadius: 999, border: 'none', cursor: 'pointer', background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <X size={18} color={C.dim} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 650, color: C.cream }}>Share workout</span>
        <div style={{ width: 38 }} />
      </div>

      {/* Controls row — format toggle only. The old style/photo toggles
          retired with the design refresh; every share now uses the single
          HIIT template. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '8px 16px 4px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, padding: 3, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 999 }}>
          <ControlSeg
            active={square}
            onClick={() => setFormat('square')}
            label="Square"
            icon={<Square size={15} color={square ? C.cream : C.dim} strokeWidth={2.1} />}
          />
          <ControlSeg
            active={!square}
            onClick={() => setFormat('story')}
            label="Story"
            icon={<Smartphone size={15} color={!square ? C.cream : C.dim} strokeWidth={2.1} />}
          />
        </div>
      </div>

      {/* Preview — same source (ActivityShareCard) as what handleShare
          eventually snapshots, so what the user sees IS what they share. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, gap: 10, padding: '6px 0' }}>
        <div style={{
          width: previewW, height: previewH, borderRadius: 20, overflow: 'hidden', position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          transition: 'width 0.35s cubic-bezier(.4,0,.2,1), height 0.35s cubic-bezier(.4,0,.2,1)',
        }}>
          <div style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <ActivityShareCard data={shareData} format={format} />
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
            width: '100%', maxWidth: 360, height: 56, borderRadius: 16, border: 'none',
            cursor: isSharing ? 'default' : 'pointer',
            background: isSharing ? '#444' : `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`,
            color: '#1a0d04', fontFamily: FONT_UI, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            boxShadow: isSharing ? 'none' : '0 10px 26px rgba(249,115,22,0.42), 0 4px 10px rgba(0,0,0,0.4)',
            transition: 'background 0.15s, box-shadow 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isSharing ? 'Preparing…' : 'Share'}
        </button>
      </div>
    </div>
  );
}
