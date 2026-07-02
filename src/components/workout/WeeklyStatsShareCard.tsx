// HIIT · Weekly Stats Share Card
// React port of the claude_design "Weekly Stats Share Card" — matches the
// Activity Share Cards visual system: white canvas, orange hex logo,
// condensed labels each on a short underline, dark condensed values with
// orange unit suffixes, and the reference activity line bleeding off the
// lower edge. Two formats (post 1080×1080, story 1080×1920) and two bg
// variants (white, transparent).

const T = {
  bg: '#ffffff',
  ink: '#1c150e',
  primary: '#f26c21',
  dim: '#b9a99a',
  cond: "'Saira Condensed','Inter',sans-serif",
} as const

// Path traced from the reference image (card coordinates, 1080×1920).
const REF_LINE =
  'M 108 1822.1 L 116.7 1812.3 L 126 1802.5 L 134.8 1792.9 L 144 1782.7 L 152.8 1773.3 L 162 1763.1 L 170.7 1756.4 L 180 1756.4 L 198 1756.4 L 216 1756.4 L 234 1756.4 L 252 1756.4 L 270 1756.6 L 288 1757.8 L 306 1758.9 L 324 1760.1 L 342 1755.3 L 360 1748.9 L 378 1742.6 L 396 1736.1 L 414 1729 L 432 1717.8 L 450 1706.7 L 468 1695.7 L 486 1687.3 L 504 1682.5 L 522 1677.7 L 540 1675.6 L 557.5 1678.1 L 576 1680.6 L 594 1683.3 L 612 1685.8 L 630 1688.3 L 648 1688.1 L 666 1681.9 L 684 1675.4 L 702 1668.9 L 720 1662.7 L 738 1656.4 L 756 1648.3 L 774 1636 L 792 1623.6 L 810 1613.6 L 828 1595.3 L 846 1579.4 L 864 1563.5 L 882 1548.1 L 900 1532.2 L 918 1516.8 L 926.7 1509.9'

export type WeeklyStatsFormat = 'post' | 'story'
export type WeeklyStatsBg = 'white' | 'transparent'

export interface WeeklyStatsMetric {
  label: string
  value: string
  unit?: string
}

export interface WeeklyStatsData {
  title: string
  dateRange: string
  metrics: [WeeklyStatsMetric, WeeklyStatsMetric, WeeklyStatsMetric, WeeklyStatsMetric]
}

const SZ = {
  story: { label: 34, value: 132, unit: 44, blockGap: 22 },
  post: { label: 30, value: 108, unit: 36, blockGap: 18 },
} as const

function ActivityLine({ format }: { format: WeeklyStatsFormat }) {
  const square = format === 'post'
  const H = square ? 1080 : 1920
  // On the post format we shift the path up so the same reference line
  // still bleeds off the bottom of the shorter canvas.
  const shift = square ? -800 : 0
  return (
    <svg width={1080} height={H} viewBox={`0 0 1080 ${H}`} style={{ display: 'block' }}>
      <path
        d={REF_LINE}
        transform={shift ? `translate(0 ${shift})` : undefined}
        fill="none"
        stroke={T.primary}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HexLogo({ size }: { size: number }) {
  return (
    <img
      src="/hiit-logo-orange.png"
      alt="HIIT"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain' }}
    />
  )
}

function LabelRule({ children, size }: { children: React.ReactNode; size: number }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <span
        style={{
          fontFamily: T.cond,
          fontWeight: 700,
          fontSize: size,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.primary,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <div
        style={{
          height: Math.max(3, Math.round(size * 0.14)),
          background: T.primary,
          borderRadius: 3,
          marginTop: Math.round(size * 0.47),
        }}
      />
    </div>
  )
}

function Metric({
  m,
  sz,
}: {
  m: WeeklyStatsMetric
  sz: (typeof SZ)[WeeklyStatsFormat]
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: sz.blockGap,
      }}
    >
      <LabelRule size={sz.label}>{m.label}</LabelRule>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span
          style={{
            fontFamily: T.cond,
            fontWeight: 700,
            fontSize: sz.value,
            letterSpacing: '-0.01em',
            color: T.ink,
            lineHeight: 0.82,
          }}
        >
          {m.value}
        </span>
        {m.unit && (
          <span
            style={{
              fontFamily: T.cond,
              fontWeight: 600,
              fontSize: sz.unit,
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: T.primary,
              lineHeight: 1,
            }}
          >
            {m.unit}
          </span>
        )}
      </div>
    </div>
  )
}

function Eyebrow({ title, dateRange, f, gap }: {
  title: string
  dateRange: string
  f: number
  gap: number
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(f * 0.5) }}>
      <span
        style={{
          fontFamily: T.cond,
          fontWeight: 700,
          fontSize: f,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: T.ink,
        }}
      >
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.primary }} />
        <span
          style={{
            fontFamily: T.cond,
            fontWeight: 600,
            fontSize: Math.round(f * 0.86),
            letterSpacing: '0.24em',
            color: T.dim,
          }}
        >
          {dateRange}
        </span>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: T.primary }} />
      </div>
    </div>
  )
}

export interface WeeklyStatsShareCardProps {
  data: WeeklyStatsData
  format?: WeeklyStatsFormat
  bg?: WeeklyStatsBg
}

export function WeeklyStatsShareCard({
  data,
  format = 'story',
  bg = 'white',
}: WeeklyStatsShareCardProps) {
  const square = format === 'post'
  const H = square ? 1080 : 1920
  const sz = SZ[format]
  return (
    <div
      style={{
        width: 1080,
        height: H,
        position: 'relative',
        overflow: 'hidden',
        background: bg === 'white' ? T.bg : 'transparent',
        boxSizing: 'border-box',
        fontFamily: T.cond,
      }}
    >
      {square ? (
        <div
          style={{
            position: 'absolute',
            top: 104,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <HexLogo size={132} />
          <div style={{ marginTop: 30 }}>
            <Eyebrow title={data.title} dateRange={data.dateRange} f={28} gap={14} />
          </div>
          <div
            style={{
              marginTop: 78,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              rowGap: 66,
              columnGap: 40,
              width: 760,
            }}
          >
            {data.metrics.map((m) => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'center' }}>
                <Metric m={m} sz={sz} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 150,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <HexLogo size={182} />
          <div style={{ marginTop: 40 }}>
            <Eyebrow title={data.title} dateRange={data.dateRange} f={32} gap={16} />
          </div>
          <div
            style={{
              marginTop: 112,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 92,
            }}
          >
            {data.metrics.map((m) => (
              <Metric key={m.label} m={m} sz={sz} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
