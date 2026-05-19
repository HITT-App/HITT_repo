// Custom HIIT branded emoji/glyph set — ported from design handoff
// Usage: <HEmoji name="streak" size={24} variant="sticker" />
// Variants: sticker (default) | dark | outline

import React from "react"

type HEmojiName = 'streak' | 'nutrition' | 'ai' | 'social' | 'announcement' | 'leaderboard' | 'schedule' | 'workouts' | 'camera'
type HEmojiVariant = 'sticker' | 'dark' | 'outline'

interface HEmojiProps {
  name: HEmojiName
  size?: number
  variant?: HEmojiVariant
  className?: string
  style?: React.CSSProperties
}

const OR      = '#FF8A26'
const OR_LITE = '#FFB066'
const OR_DEEP = '#D86310'
const DARK    = '#1a0d04'
const CREAM   = '#FFE9D2'

const LOGO_H     = "M28,14 L40,0 L46,0 L46,42 L54,42 L54,0 L60,0 L72,14 L72,86 L60,100 L54,100 L54,58 L46,58 L46,100 L40,100 L28,86 Z"
const LOGO_WINGL = "M4,36 L24,22 L24,78 L4,64 Z"
const LOGO_WINGR = "M76,22 L96,36 L96,64 L76,78 Z"

const HMark = ({ x = 0, y = 0, s = 8, color = DARK, opacity = 1, wings = true }) => (
  <g transform={`translate(${x} ${y}) scale(${s / 100})`} opacity={opacity}>
    <g fill={color}>
      <path d={LOGO_H}/>
      {wings && <path d={LOGO_WINGL}/>}
      {wings && <path d={LOGO_WINGR}/>}
    </g>
  </g>
)

const Defs = ({ uid }: { uid: string }) => (
  <defs>
    <linearGradient id={`${uid}-or`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={OR_LITE}/>
      <stop offset="55%" stopColor={OR}/>
      <stop offset="100%" stopColor={OR_DEEP}/>
    </linearGradient>
  </defs>
)

const pal = (v: HEmojiVariant) => {
  if (v === 'dark')    return { isSticker: false, isDark: true,  isOutline: false, glyphFill: OR,    glyphStroke: OR_DEEP, bg: DARK }
  if (v === 'outline') return { isSticker: false, isDark: false, isOutline: true,  glyphFill: 'none', glyphStroke: DARK,   bg: 'transparent' }
  return                      { isSticker: true,  isDark: false, isOutline: false, glyphFill: OR,    glyphStroke: DARK,   bg: 'transparent' }
}

const Streak = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const flame = "M30 6 C28 16 16 20 12 30 C8 38 10 48 18 54 C24 58 28 56 32 56 C36 56 40 58 46 54 C54 48 56 36 52 28 C46 18 38 14 36 4 C34 12 32 14 32 22 C32 16 31 10 30 6 Z"
  const lick  = "M40 22 C39 28 34 30 34 38 C34 44 37 48 41 49 C45 48 47 44 47 38 C47 30 42 28 40 22 Z"
  const inner = "M28 26 C27 32 22 34 22 42 C22 49 26 54 32 55 C38 54 42 49 42 42 C42 34 35 32 33 24 C32 28 30 30 30 33 C30 30 29 28 28 26 Z"
  return (
    <g>
      <path d={flame}
        fill={p.isOutline ? 'none' : (p.isSticker ? OR : DARK)}
        stroke={p.isDark ? OR : DARK}
        strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      <path d={lick}
        fill={p.isOutline ? 'none' : (p.isSticker ? OR_DEEP : OR)}
        stroke={DARK} strokeWidth={p.isOutline ? 2.4 : 1.6} strokeLinejoin="round"/>
      <path d={inner}
        fill={p.isOutline ? 'none' : (p.isSticker ? OR_LITE : OR)}
        stroke={p.isOutline ? DARK : 'none'} strokeWidth={p.isOutline ? 2 : 0}/>
      {p.isSticker && <path d="M22 18 Q18 26 20 36" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
    </g>
  )
}

const Nutrition = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const apple = "M32 20 C24 12 12 14 8 24 C4 34 10 52 22 56 C26 57 28 56 32 56 C36 56 38 57 42 56 C54 52 60 34 56 24 C52 14 40 12 32 20 Z"
  return (
    <g>
      <path d="M32 18 Q40 6 46 8 Q44 14 38 18 Q34 18 32 18 Z"
        fill={p.isOutline ? 'none' : (p.isSticker ? '#2a8a3e' : OR)}
        stroke={DARK} strokeWidth={p.isOutline ? 2.4 : 1.8} strokeLinejoin="round"/>
      <path d="M32 20 Q31 14 33 11" stroke={DARK} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d={apple}
        fill={p.isOutline ? 'none' : (p.isSticker ? OR : DARK)}
        stroke={p.isDark ? OR : DARK} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      {!p.isOutline && (
        <ellipse cx="50" cy="32" rx="2.4" ry="3.4" fill={p.isSticker ? '#fff' : OR_LITE} opacity="0.6"/>
      )}
    </g>
  )
}

const AI = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const spark = "M32 4 C33 22 42 31 60 32 C42 33 33 42 32 60 C31 42 22 33 4 32 C22 31 31 22 32 4 Z"
  return (
    <g>
      <path d={spark}
        fill={p.isOutline ? 'none' : (p.isSticker ? OR : DARK)}
        stroke={p.isDark ? OR : DARK} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      <HMark x={20} y={20} s={24} color={p.isOutline ? DARK : (p.isSticker ? DARK : OR)} opacity={1}/>
      {!p.isOutline && (
        <g fill={p.isSticker ? DARK : OR}>
          <circle cx="13" cy="13" r="2"/>
          <circle cx="52" cy="52" r="2"/>
        </g>
      )}
    </g>
  )
}

const Social = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const figColors = p.isOutline
    ? [{ fill: 'none', stroke: DARK }, { fill: 'none', stroke: DARK }, { fill: 'none', stroke: DARK }]
    : [{ fill: CREAM, stroke: DARK }, { fill: OR, stroke: DARK }, { fill: OR_LITE, stroke: DARK }]

  const bust = (hx: number, hy: number, hr: number, bottomY: number) => {
    const w = hr * 2.5, sx = hx - w/2, ex = hx + w/2
    const shoulderY = hy + hr - 2, neckHalf = hr * 0.55
    return `M ${sx} ${bottomY} L ${sx} ${shoulderY + 5} Q ${sx} ${shoulderY} ${hx - neckHalf} ${shoulderY} L ${hx + neckHalf} ${shoulderY} Q ${ex} ${shoulderY} ${ex} ${shoulderY + 5} L ${ex} ${bottomY} Z`
  }

  const figures = [
    { head: [32, 13, 8] as [number,number,number], bottom: 62 },
    { head: [14, 32, 8.5] as [number,number,number], bottom: 62 },
    { head: [50, 32, 8.5] as [number,number,number], bottom: 62 },
  ]
  const sw = p.isOutline ? 2.6 : 2

  return (
    <g>
      {figures.map((f, i) => {
        const c = figColors[i]
        const [hx, hy, hr] = f.head
        return (
          <g key={i}>
            <path d={bust(hx, hy, hr, f.bottom)} fill={c.fill} stroke={c.stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx={hx} cy={hy} r={hr} fill={c.fill} stroke={c.stroke} strokeWidth={sw}/>
          </g>
        )
      })}
    </g>
  )
}

const Announce = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  return (
    <g transform="rotate(-12 32 32)">
      <path d="M14 22 L48 12 L48 52 L14 42 Z"
        fill={p.isOutline ? 'none' : (p.isSticker ? OR : DARK)}
        stroke={p.isDark ? OR : DARK} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      <rect x="48" y="22" width="8" height="20" rx="3"
        fill={p.isOutline ? 'none' : (p.isSticker ? OR_DEEP : OR)}
        stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <g stroke={p.isOutline ? DARK : (p.isSticker ? DARK : OR)} strokeWidth="2.4" strokeLinecap="round" fill="none">
        <path d="M60 18 L66 14"/>
        <path d="M60 32 L68 32"/>
        <path d="M60 46 L66 50"/>
      </g>
    </g>
  )
}

const Leaderboard = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  return (
    <g>
      <path d="M32 6 L34.5 12 L41 12.6 L36 16.8 L37.6 23 L32 19.5 L26.4 23 L28 16.8 L23 12.6 L29.5 12 Z"
        fill={p.isOutline ? 'none' : OR} stroke={DARK} strokeWidth={p.isOutline ? 2.4 : 1.8} strokeLinejoin="round"/>
      <rect x="44" y="40" width="14" height="16" rx="2"
        fill={p.isOutline ? 'none' : CREAM} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <rect x="6" y="34" width="14" height="22" rx="2"
        fill={p.isOutline ? 'none' : CREAM} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <rect x="22" y="26" width="20" height="30" rx="2"
        fill={p.isOutline ? 'none' : OR} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      {!p.isOutline && <HMark x={21} y={30} s={22} color={DARK} opacity={p.isSticker ? 0.95 : 1}/>}
      {!p.isOutline && (
        <g fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize="9" fill={DARK}>
          <text x="10.5" y="50" textAnchor="middle">2</text>
          <text x="51" y="52" textAnchor="middle">3</text>
        </g>
      )}
    </g>
  )
}

const Schedule = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  return (
    <g>
      <rect x="18" y="6" width="4" height="10" rx="1.5" fill={DARK}/>
      <rect x="42" y="6" width="4" height="10" rx="1.5" fill={DARK}/>
      <rect x="8" y="12" width="48" height="46" rx="5"
        fill={p.isOutline ? 'none' : (p.isSticker ? '#fff' : DARK)}
        stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <path d="M8 17 L8 24 L56 24 L56 17 A5 5 0 0 0 51 12 L13 12 A5 5 0 0 0 8 17 Z"
        fill={OR} stroke={DARK} strokeWidth="0"/>
      <line x1="8" y1="24" x2="56" y2="24" stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <g fill={p.isOutline ? DARK : (p.isSticker ? DARK : CREAM)}>
        {[0,1,2,3].flatMap(c => [0,1,2].map(r => {
          const cx = 16 + c*10, cy = 32 + r*9
          if (c === 2 && r === 1) return null
          return <circle key={`${c}-${r}`} cx={cx} cy={cy} r="1.8" opacity={0.55}/>
        }))}
      </g>
      <circle cx="36" cy="41" r="8"
        fill={p.isOutline ? 'none' : OR} stroke={DARK} strokeWidth={p.isOutline ? 2.4 : 1.6}/>
      <HMark x={28} y={33} s={16} color={DARK} opacity={1}/>
    </g>
  )
}

const Workouts = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const weightFill  = p.isOutline ? 'none' : (p.isSticker ? OR : DARK)
  const weightStroke = p.isDark ? OR : DARK
  const innerFill   = p.isOutline ? 'none' : (p.isSticker ? OR_DEEP : OR)
  const barFill     = p.isOutline ? 'none' : (p.isSticker ? CREAM : OR_LITE)
  return (
    <g transform="rotate(-14 32 32)">
      <rect x="4"  y="18" width="11" height="28" rx="3" fill={weightFill} stroke={weightStroke} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      <rect x="15" y="22" width="7"  height="20" rx="2" fill={innerFill}  stroke={DARK}         strokeWidth={p.isOutline ? 2.4 : 1.8}/>
      <rect x="22" y="29" width="20" height="6"        fill={barFill}    stroke={DARK}         strokeWidth={p.isOutline ? 3 : 2.2}/>
      <rect x="42" y="22" width="7"  height="20" rx="2" fill={innerFill}  stroke={DARK}         strokeWidth={p.isOutline ? 2.4 : 1.8}/>
      <rect x="49" y="18" width="11" height="28" rx="3" fill={weightFill} stroke={weightStroke} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      {p.isSticker && <path d="M8 22 L8 36" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round"/>}
    </g>
  )
}

const Camera = ({ variant }: { variant: HEmojiVariant }) => {
  const p = pal(variant)
  const bodyFill  = p.isOutline ? 'none' : (p.isSticker ? OR : DARK)
  const prismFill = p.isOutline ? 'none' : (p.isSticker ? OR_DEEP : OR)
  const lensFill  = p.isOutline ? 'none' : (p.isSticker ? DARK : CREAM)
  const glassFill = p.isOutline ? 'none' : (p.isSticker ? OR_LITE : OR)
  const flashFill = p.isOutline ? 'none' : (p.isSticker ? CREAM : OR_LITE)
  return (
    <g>
      <path d="M22 14 L26 8 L40 8 L44 14 Z"
        fill={prismFill} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2} strokeLinejoin="round"/>
      <rect x="5" y="14" width="54" height="42" rx="5"
        fill={bodyFill} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <circle cx="50" cy="22" r="2.6"
        fill={flashFill} stroke={DARK} strokeWidth={p.isOutline ? 2 : 1.6}/>
      <circle cx="32" cy="37" r="13"
        fill={lensFill} stroke={DARK} strokeWidth={p.isOutline ? 3 : 2.2}/>
      <circle cx="32" cy="37" r="7.5"
        fill={glassFill} stroke={DARK} strokeWidth={p.isOutline ? 2.4 : 1.6}/>
      {p.isSticker && <path d="M27 33 Q26 39 30 42" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" fill="none" strokeLinecap="round"/>}
    </g>
  )
}

const MAP: Record<HEmojiName, React.FC<{ variant: HEmojiVariant }>> = {
  streak: Streak,
  nutrition: Nutrition,
  ai: AI,
  social: Social,
  announcement: Announce,
  leaderboard: Leaderboard,
  schedule: Schedule,
  workouts: Workouts,
  camera: Camera,
}

export const HEmoji = ({ name, size = 64, variant = 'sticker', className, style }: HEmojiProps) => {
  const uid = React.useId().replace(/:/g, '')
  const G = MAP[name]
  if (!G) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      className={className}
    >
      <Defs uid={uid}/>
      <G variant={variant}/>
    </svg>
  )
}
