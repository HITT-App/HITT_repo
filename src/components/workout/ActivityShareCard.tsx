// HIIT Activity Share Card — post-workout PNG generated for share sheets.
// One template, 9 activity variants, 5 curve types, story (1080×1920) +
// square (1080×1080) formats. Faithful port of the claude.ai/design spec
// at /design/p/019e018c-88f1-70c5-8a20-6653803651f6 ("Activity Share Cards").
//
// Rendered off-screen and snapshotted by `generate-share-card.ts` — never
// mounted directly to visible UI.

import { format as formatDate } from 'date-fns';

// ── Theme ───────────────────────────────────────────────────────────────────

const T = {
  bg: '#ffffff',
  ink: '#1c150e',
  primary: '#f26c21',
  dim: '#b9a99a',
  cond: "'Saira Condensed', 'Impact', 'Inter', sans-serif",
} as const;

// ── Activity taxonomy ───────────────────────────────────────────────────────

export type ActivityKey =
  | 'hiit' | 'triathlon' | 'run' | 'bike' | 'swim'
  | 'strength' | 'cardio' | 'walk' | 'hike' | 'yoga';

type CurveType = 'climb' | 'intervals' | 'waves' | 'hr' | 'gentle';

// Named + typed spec — kept close to the design file. The `line` field drives
// which SVG curve draws at the bottom of the card.
const ACTIVITY_SPECS: Record<ActivityKey, { name: string; curve: CurveType }> = {
  hiit:      { name: 'HIIT',           curve: 'intervals' },
  triathlon: { name: 'Triathlon',      curve: 'climb' },
  run:       { name: 'Run',            curve: 'climb' },
  bike:      { name: 'Bike',           curve: 'climb' },
  swim:      { name: 'Swim',           curve: 'waves' },
  strength:  { name: 'Strength',       curve: 'intervals' },
  cardio:    { name: 'Cardio',         curve: 'hr' },
  // Split — the design merged these but a "Walk · Hike" eyebrow on a
  // plain walk read as wrong to real users. Both use the climb curve so
  // still feel like siblings.
  walk:      { name: 'Walk',           curve: 'climb' },
  hike:      { name: 'Hike',           curve: 'climb' },
  yoga:      { name: 'Yoga · Stretch', curve: 'gentle' },
};

// Map raw activity_type strings from the app onto the 9 design keys. Anything
// unrecognised falls through to 'cardio' (the safest generic — duration, HR,
// calories, an EKG-style curve).
export function resolveActivityKey(raw: string | null | undefined): ActivityKey {
  const t = (raw ?? '').toLowerCase();
  if (t === 'hiit') return 'hiit';
  if (t === 'triathlon') return 'triathlon';
  if (t === 'run' || t === 'running' || t === 'jogging') return 'run';
  if (t === 'bike' || t === 'cycling' || t === 'cycle') return 'bike';
  if (t === 'swim' || t === 'swimming') return 'swim';
  if (t === 'strength' || t === 'gym' || t === 'weights' || t === 'weightlifting') return 'strength';
  if (t === 'walking' || t === 'walk') return 'walk';
  if (t === 'hiking' || t === 'hike') return 'hike';
  if (t === 'yoga' || t === 'stretch' || t === 'stretching' || t === 'mobility') return 'yoga';
  // martial-arts, aerobics, "other", or any unrecognised input → cardio
  return 'cardio';
}

// ── Metrics ─────────────────────────────────────────────────────────────────

type Metric =
  | { label: string; value: string; unit?: string }
  | { label: string; rows: Array<{ k: string; v: string }> };

export interface ActivityShareData {
  activityType: string;
  durationSeconds: number;
  calories?: number | null;
  distanceKm?: number | null;
  avgHR?: number | null;
  paceSecondsPerKm?: number | null;
  // Swim-specific: pace per 100m in seconds. If absent for a swim, we
  // derive it from distance + duration when both are present.
  swimPacePer100m?: number | null;
  // Strength-specific
  volumeKg?: number | null;
  exerciseCount?: number | null;
  // Yoga-specific — style name shown as second metric (e.g. "Vinyasa")
  sessionName?: string | null;
  // Triathlon-specific
  triathlonSplits?: { swim?: string; bike?: string; run?: string };
}

function fmtDurationHMS(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDurationCompact(seconds: number): { value: string; unit: string } {
  if (!Number.isFinite(seconds) || seconds < 0) return { value: '—', unit: '' };
  if (seconds >= 3600) return { value: fmtDurationHMS(seconds), unit: '' };
  return { value: String(Math.round(seconds / 60)), unit: 'min' };
}

function fmtPacePerKm(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}

function buildMetrics(key: ActivityKey, d: ActivityShareData): Metric[] {
  switch (key) {
    case 'hiit': {
      const dur = fmtDurationCompact(d.durationSeconds);
      return [
        { label: 'Duration', value: dur.value, unit: dur.unit },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
        { label: 'Avg HR', value: d.avgHR != null ? String(Math.round(d.avgHR)) : '—', unit: 'bpm' },
      ];
    }
    case 'triathlon': {
      const splits = d.triathlonSplits ?? {};
      return [
        { label: 'Total Time', value: fmtDurationHMS(d.durationSeconds) },
        { label: 'Splits', rows: [
          { k: 'Swim', v: splits.swim ?? '—' },
          { k: 'Bike', v: splits.bike ?? '—' },
          { k: 'Run', v: splits.run ?? '—' },
        ] },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'run': {
      const km = d.distanceKm ?? 0;
      const pace = d.paceSecondsPerKm
        ?? (km > 0 && d.durationSeconds > 0 ? d.durationSeconds / km : null);
      return [
        { label: 'Distance', value: km ? km.toFixed(1) : '—', unit: 'km' },
        { label: 'Avg Pace', value: pace ? fmtPacePerKm(pace) : '—', unit: '/km' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'bike': {
      const km = d.distanceKm ?? 0;
      const avgSpeed = km > 0 && d.durationSeconds > 0
        ? (km / (d.durationSeconds / 3600))
        : null;
      return [
        { label: 'Distance', value: km ? km.toFixed(1) : '—', unit: 'km' },
        { label: 'Avg Speed', value: avgSpeed ? avgSpeed.toFixed(1) : '—', unit: 'km/h' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'swim': {
      const meters = (d.distanceKm ?? 0) * 1000;
      // Derive per-100m pace from total distance + duration when absent.
      const per100 = d.swimPacePer100m
        ?? (meters > 0 && d.durationSeconds > 0 ? d.durationSeconds / (meters / 100) : null);
      return [
        { label: 'Distance', value: meters ? fmtInt(meters) : '—', unit: 'm' },
        { label: 'Pace', value: per100 ? fmtPacePerKm(per100) : '—', unit: '/100m' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'strength': {
      // If volume was tracked, show it; otherwise fall back to duration so we
      // don't show a wrong "0 kg" volume.
      const volumeMetric: Metric = d.volumeKg && d.volumeKg > 0
        ? { label: 'Volume', value: fmtInt(d.volumeKg), unit: 'kg' }
        : (() => {
            const dur = fmtDurationCompact(d.durationSeconds);
            return { label: 'Duration', value: dur.value, unit: dur.unit };
          })();
      return [
        volumeMetric,
        { label: 'Exercises', value: d.exerciseCount != null ? String(d.exerciseCount) : '—' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'cardio': {
      const dur = fmtDurationCompact(d.durationSeconds);
      return [
        { label: 'Duration', value: dur.value, unit: dur.unit },
        { label: 'Avg HR', value: d.avgHR != null ? String(Math.round(d.avgHR)) : '—', unit: 'bpm' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'walk':
    case 'hike': {
      const km = d.distanceKm ?? 0;
      return [
        { label: 'Distance', value: km ? km.toFixed(1) : '—', unit: 'km' },
        { label: 'Duration', value: fmtDurationHMS(d.durationSeconds) },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
    case 'yoga': {
      // Yoga uses the same three metrics as cardio (Duration / Avg HR / Calories)
      // but its own `gentle` curve + "Yoga · Stretch" eyebrow keep it visually
      // distinct. We don't record a yoga style, so the design's "Session" field
      // is dropped.
      const dur = fmtDurationCompact(d.durationSeconds);
      return [
        { label: 'Duration', value: dur.value, unit: dur.unit },
        { label: 'Avg HR', value: d.avgHR != null ? String(Math.round(d.avgHR)) : '—', unit: 'bpm' },
        { label: 'Calories', value: fmtInt(d.calories ?? 0), unit: 'kcal' },
      ];
    }
  }
}

// ── Signature curves (bleed off the bottom edge) ───────────────────────────
//
// All paths defined in story coordinates (1080×1920). Square format applies a
// vertical translate of -800 to bring the same curves into the lower third of
// the 1:1 frame. Same shift the reference design uses.

const CURVES: Record<CurveType, string> = {
  // Mountain profile — traced from the reference design.
  climb:
    'M 108 1822.1 L 116.7 1812.3 L 126 1802.5 L 134.8 1792.9 L 144 1782.7 L 152.8 1773.3 L 162 1763.1 L 170.7 1756.4 L 180 1756.4 L 198 1756.4 L 216 1756.4 L 234 1756.4 L 252 1756.4 L 270 1756.6 L 288 1757.8 L 306 1758.9 L 324 1760.1 L 342 1755.3 L 360 1748.9 L 378 1742.6 L 396 1736.1 L 414 1729 L 432 1717.8 L 450 1706.7 L 468 1695.7 L 486 1687.3 L 504 1682.5 L 522 1677.7 L 540 1675.6 L 557.5 1678.1 L 576 1680.6 L 594 1683.3 L 612 1685.8 L 630 1688.3 L 648 1688.1 L 666 1681.9 L 684 1675.4 L 702 1668.9 L 720 1662.7 L 738 1656.4 L 756 1648.3 L 774 1636 L 792 1623.6 L 810 1613.6 L 828 1595.3 L 846 1579.4 L 864 1563.5 L 882 1548.1 L 900 1532.2 L 918 1516.8 L 926.7 1509.9',
  // Square-wave interval pattern — burst / recover / burst.
  intervals:
    'M 60 1800 L 180 1800 L 180 1650 L 320 1650 L 320 1800 L 440 1800 L 440 1650 L 580 1650 L 580 1800 L 700 1800 L 700 1650 L 840 1650 L 840 1800 L 960 1800 L 960 1650 L 1020 1650',
  // Sinusoidal — smooth swim strokes.
  waves:
    'M 60 1720 C 150 1620, 240 1620, 330 1720 C 420 1820, 510 1820, 600 1720 C 690 1620, 780 1620, 870 1720 C 960 1820, 1050 1820, 1140 1720',
  // Heart-rate trace — flat baseline with sharp spikes.
  hr:
    'M 60 1750 L 200 1750 L 210 1720 L 220 1670 L 232 1830 L 244 1710 L 254 1750 L 400 1750 L 410 1720 L 420 1670 L 432 1830 L 444 1710 L 454 1750 L 600 1750 L 610 1720 L 620 1670 L 632 1830 L 644 1710 L 654 1750 L 800 1750 L 810 1720 L 820 1670 L 832 1830 L 844 1710 L 854 1750 L 1020 1750',
  // Slow, single arc — yoga / stretch flow.
  gentle:
    'M 60 1730 C 240 1660, 420 1810, 600 1730 C 780 1650, 960 1780, 1080 1730',
};

function ActivityLine({ format, curve }: { format: 'story' | 'square'; curve: CurveType }) {
  const H = format === 'square' ? 1080 : 1920;
  const shift = format === 'square' ? -800 : 0;
  return (
    <svg width={1080} height={H} viewBox={`0 0 1080 ${H}`} style={{ display: 'block' }}>
      <path
        d={CURVES[curve]}
        transform={shift ? `translate(0 ${shift})` : undefined}
        fill="none"
        stroke={T.primary}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Layout building blocks ─────────────────────────────────────────────────

function HexLogo({ size, onPhoto }: { size: number; onPhoto?: boolean }) {
  // Orange standalone H mark (v2). Reads as brand on white / transparent.
  // On photo mode we need a soft drop-shadow so it doesn't fade into
  // orange-heavy photos — a common failure mode for a monochrome mark on
  // busy backgrounds.
  const shadow = onPhoto ? 'drop-shadow(0 4px 18px rgba(0,0,0,0.55))' : 'none';
  return (
    <img
      src="/hiit-logo-orange.png"
      alt="HIIT"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain', filter: shadow }}
    />
  );
}

function LabelRule({ children, size }: { children: string; size: number }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <span style={{
        fontFamily: T.cond, fontWeight: 700, fontSize: size,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: T.primary, lineHeight: 1, whiteSpace: 'nowrap',
      }}>{children}</span>
      <div style={{
        height: Math.max(3, Math.round(size * 0.14)),
        background: T.primary, borderRadius: 3,
        marginTop: Math.round(size * 0.47),
      }} />
    </div>
  );
}

const SZ_STORY = {
  label: 34, value: 120, unit: 42, blockGap: 22,
  splitGap: 12, splitGapX: 16, splitK: 30, splitV: 62, splitKW: 130, splitVW: 240,
};
const SZ_SQUARE = {
  label: 27, value: 78, unit: 29, blockGap: 14,
  splitGap: 8, splitGapX: 12, splitK: 22, splitV: 44, splitKW: 92, splitVW: 150,
};

function MetricBlock({ m, sz, light }: { m: Metric; sz: typeof SZ_STORY; light?: boolean }) {
  // Value ink flips white when we're on a photo or on transparent + light
  // ink. Label + unit stay orange (they'd disappear as white on a light
  // background) but pick up a subtle shadow on top of dark backgrounds.
  const valueColor = light ? '#ffffff' : T.ink;
  const shadow = light ? '0 2px 12px rgba(0,0,0,0.55)' : 'none';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sz.blockGap }}>
      <LabelRule size={sz.label}>{m.label}</LabelRule>
      {'rows' in m ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: sz.splitGap }}>
          {m.rows.map(r => (
            <div key={r.k} style={{ display: 'flex', alignItems: 'baseline', gap: sz.splitGapX }}>
              <span style={{
                fontFamily: T.cond, fontWeight: 600, fontSize: sz.splitK,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: T.primary, width: sz.splitKW, textAlign: 'right', lineHeight: 1,
                textShadow: shadow,
              }}>{r.k}</span>
              <span style={{
                fontFamily: T.cond, fontWeight: 700, fontSize: sz.splitV,
                letterSpacing: '-0.01em', color: valueColor,
                width: sz.splitVW, textAlign: 'left', lineHeight: 0.9,
                textShadow: shadow,
              }}>{r.v}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{
            fontFamily: T.cond, fontWeight: 700, fontSize: sz.value,
            letterSpacing: '-0.01em', color: valueColor, lineHeight: 0.82,
            textShadow: shadow,
          }}>{m.value}</span>
          {m.unit && (
            <span style={{
              fontFamily: T.cond, fontWeight: 600, fontSize: sz.unit,
              letterSpacing: '0.02em', textTransform: 'uppercase',
              color: T.primary, lineHeight: 1,
              textShadow: shadow,
            }}>{m.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ name, dateStr, f, gap, light }: { name: string; dateStr: string; f: number; gap: number; light?: boolean }) {
  // Light ink flips to white with a soft text-shadow — used on photo
  // backgrounds and on transparent with the ink=light preset.
  const nameColor = light ? '#ffffff' : T.ink;
  const dateColor = light ? 'rgba(255,255,255,0.75)' : T.dim;
  const shadow = light ? '0 2px 12px rgba(0,0,0,0.55)' : 'none';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <span style={{
        fontFamily: T.cond, fontWeight: 700, fontSize: f,
        letterSpacing: '0.28em', textTransform: 'uppercase',
        color: nameColor, textShadow: shadow,
      }}>{name}</span>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: T.primary }} />
      <span style={{
        fontFamily: T.cond, fontWeight: 600, fontSize: f,
        letterSpacing: '0.24em', color: dateColor, textShadow: shadow,
      }}>{dateStr}</span>
    </div>
  );
}

// ── Top-level card ─────────────────────────────────────────────────────────

export interface ActivityShareCardProps {
  data: ActivityShareData;
  format?: 'story' | 'square';
  // Date shown in the eyebrow. Defaults to today. Pass the activity's
  // started_at so historical shares carry the correct stamp.
  dateISO?: string;
  // Background style —
  //   • 'white'       — clean brand card (white fill)
  //   • 'photo'       — same design overlaid on a user photo with a scrim
  //   • 'transparent' — no bg fill, PNG comes out with alpha for stickers /
  //                     pasting into other media. Ink colour flips via `ink`.
  bg?: 'white' | 'photo' | 'transparent';
  // Data URL (or normal URL) of the photo to use when bg='photo'.
  photoDataUrl?: string | null;
  // Only meaningful with bg='transparent'. 'dark' keeps the near-black
  // value ink (for pasting on light backgrounds); 'light' flips values +
  // eyebrow to white with a soft shadow (for dark backgrounds).
  ink?: 'dark' | 'light';
}

export function ActivityShareCard({ data, format = 'story', dateISO, bg = 'white', photoDataUrl, ink = 'dark' }: ActivityShareCardProps) {
  const key = resolveActivityKey(data.activityType);
  const spec = ACTIVITY_SPECS[key];
  const metrics = buildMetrics(key, data);
  const dateStr = formatDate(dateISO ? new Date(dateISO) : new Date(), 'dd MMM yyyy').toUpperCase();
  const isSquare = format === 'square';
  const H = isSquare ? 1080 : 1920;
  const onPhoto = bg === 'photo';
  const onTransparent = bg === 'transparent';
  // Photo mode always flips value ink to white; transparent honours the
  // explicit `ink` prop; white uses the default dark ink.
  const useLightInk = onPhoto || (onTransparent && ink === 'light');
  // Background style. On photo mode we lay the photo as an absolute fill and
  // stack a top→bottom scrim underneath the content for legibility, mirroring
  // the treatment social apps use for text on photos. On transparent we set
  // no fill at all — html2canvas is called with backgroundColor:null so the
  // resulting PNG carries alpha.
  const rootBg = onPhoto ? '#000000' : onTransparent ? 'transparent' : T.bg;

  return (
    <div style={{
      width: 1080, height: H, position: 'relative', overflow: 'hidden',
      background: rootBg, boxSizing: 'border-box', fontFamily: T.cond,
    }}>
      {onPhoto && photoDataUrl && (
        <img
          src={photoDataUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          crossOrigin="anonymous"
        />
      )}
      {onPhoto && (
        // Vertical scrim — darker at the top and bottom, lighter in the
        // middle so the logo band + the metric stack read cleanly. The
        // photo still shows through in the middle third.
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 30%, rgba(0,0,0,0.20) 70%, rgba(0,0,0,0.65) 100%)',
        }} />
      )}
      {/* Signature activity curve — still drawn on both modes; the orange
          reads over the scrim without help. */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <ActivityLine format={format} curve={spec.curve} />
      </div>

      {/* Content stack */}
      {isSquare ? (
        <div style={{
          position: 'absolute', top: 92, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <HexLogo size={128} onPhoto={onPhoto} />
          <div style={{ marginTop: 26 }}>
            <Eyebrow name={spec.name} dateStr={dateStr} f={26} gap={16} light={useLightInk} />
          </div>
          <div style={{
            marginTop: 76,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 54,
          }}>
            {metrics.map(m => <MetricBlock key={m.label} m={m} sz={SZ_SQUARE} light={useLightInk} />)}
          </div>
        </div>
      ) : (
        <div style={{
          position: 'absolute', top: 150, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <HexLogo size={182} onPhoto={onPhoto} />
          <div style={{ marginTop: 34 }}>
            <Eyebrow name={spec.name} dateStr={dateStr} f={30} gap={18} light={useLightInk} />
          </div>
          <div style={{
            marginTop: 118,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 116,
          }}>
            {metrics.map(m => <MetricBlock key={m.label} m={m} sz={SZ_STORY} light={useLightInk} />)}
          </div>
        </div>
      )}
    </div>
  );
}
