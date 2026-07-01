import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useStreaksAndBadges } from '@/hooks/useStreaksAndBadges'
import { CompletionSummary } from '@/components/workout/CompletionSummary'
import { NewBadgeModal } from '@/components/gamification/NewBadgeModal'
import { AIFormAnalysis } from '@/components/workout/AIFormAnalysis'
import { notifyUser, schedulePBShareReminder } from '@/lib/notify'
import { startWorkoutMirroring, endWorkoutMirroring, sendWorkoutToWatch } from '@/plugins/WatchPlugin'
import { sendStructuredWorkoutToWatch } from '@/plugins/WatchPlugin'
import { usePrimaryWearable } from '@/hooks/usePrimaryWearable'
import { WearableLaunchCard } from '@/components/wearable/WearableLaunchCard'
import type { PrimaryWearable } from '@/lib/wearable-detection'
import { Capacitor } from '@capacitor/core'
import { getYouTubeEmbedUrl } from '@/lib/video'
import {
  ArrowLeft, Play, Pause, SkipBack, SkipForward,
  Clock, Repeat2, Info, ChevronRight, Check,
  Plus, Watch, Flame, Dumbbell, ArrowRight, List,
} from 'lucide-react'

// ── palette ────────────────────────────────────────────────────────────────────
const WP = {
  bg: '#0a0a0a', surface: '#141414', line: '#262626', line2: '#333333',
  fg: '#fafafa', dim: '#9a9a9a', accent: '#f97316',
  good: '#4ade80', gold: '#F0B53C',
}
const tintWP = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
const REST_SECS = 30

// ── types ──────────────────────────────────────────────────────────────────────
type WPView = 'ready' | 'countdown' | 'getready' | 'active' | 'rest' | 'playlist' | 'completed'

type Workout = {
  id: string
  title: string
  description: string
  duration_minutes: number
  calories_burned: number
}

type Exercise = {
  id: string
  title: string
  description: string
  duration_seconds: number
  sets: number | null
  reps: number | null
  body_area: string
  order_index: number
  thumbnail_url: string | null
  video_url: string | null
}

type PBKind = 'duration' | 'calories' | 'streak'
type DetectedPB = { kind: PBKind; label: string; value: number; previousBest: number }

// ── exercise helpers ───────────────────────────────────────────────────────────
const exMode = (ex: Exercise) => (ex.sets && ex.reps) ? 'reps' as const : 'time' as const

const exCues = (ex: Exercise): string[] => {
  if (!ex.description) return []
  return ex.description.split(/[.\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
}

const exLabel = (ex: Exercise) =>
  exMode(ex) === 'time'
    ? `${ex.duration_seconds || 45}s hold`
    : `${ex.reps} reps × ${ex.sets} sets`

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

// ── sub-components ─────────────────────────────────────────────────────────────

function ExerciseMedia({ exercise, isPaused }: { exercise: Exercise | undefined; isPaused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoUrl = exercise?.video_url
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null
  const isDirectVideo = videoUrl && !embedUrl

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isPaused) v.pause(); else v.play().catch(() => {})
  }, [isPaused])

  useEffect(() => {
    const v = videoRef.current
    if (v && isDirectVideo) {
      v.currentTime = 0
      if (!isPaused) v.play().catch(() => {})
    }
  }, [exercise?.id, isDirectVideo, isPaused])

  if (embedUrl) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
        <iframe key={exercise?.id} src={embedUrl} style={{ width: '100%', height: '100%' }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen title={exercise?.title || 'Exercise video'} />
      </div>
    )
  }
  if (isDirectVideo) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
        <video ref={videoRef} src={videoUrl!}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          poster={exercise?.thumbnail_url || undefined} autoPlay loop muted playsInline />
      </div>
    )
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#101010' }}>
      {exercise?.thumbnail_url
        ? <img src={exercise.thumbnail_url} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        : <div style={{ position: 'absolute', inset: 0, opacity: 0.45,
            background: 'repeating-linear-gradient(135deg, #181818 0 13px, #121212 13px 26px)' }} />
      }
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 80% at 50% 35%, rgba(0,0,0,0) 30%, rgba(0,0,0,.65) 100%)' }} />
    </div>
  )
}

function ExerciseThumb({ exercise, style }: { exercise: Exercise; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#101010', flexShrink: 0, ...style }}>
      {exercise.thumbnail_url
        ? <img src={exercise.thumbnail_url} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
        : <div style={{ position: 'absolute', inset: 0, opacity: 0.45,
            background: 'repeating-linear-gradient(135deg, #181818 0 8px, #0e0e0e 8px 16px)' }} />
      }
    </div>
  )
}

function CompleteButton({ label, onComplete }: { label: string; onComplete: () => void }) {
  return (
    <button
      onClick={onComplete}
      style={{
        width: '100%', height: 60, borderRadius: 14, border: 0,
        background: WP.accent, color: '#1a0a00',
        fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
        cursor: 'pointer', touchAction: 'manipulation',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      <Check size={18} strokeWidth={2.5} /> {label}
    </button>
  )
}

function StepRail({ idx, total }: { idx: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 99,
          background: i <= idx ? WP.accent : 'rgba(255,255,255,.14)',
          opacity: i === idx ? 1 : i < idx ? 0.9 : 1,
        }} />
      ))}
    </div>
  )
}

function SetDots({ total, done }: { total: number; done: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === done ? 20 : 9, height: 9, borderRadius: 99,
          background: i <= done ? WP.accent : 'rgba(255,255,255,.18)',
          opacity: i <= done ? 1 : 0.6, transition: 'all .25s ease',
        }} />
      ))}
    </div>
  )
}

function Cues({ cues, compact }: { cues: string[]; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 7 : 9 }}>
      {cues.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 18, height: 18, borderRadius: 99, flexShrink: 0, marginTop: 1,
            background: 'rgba(249,115,22,.16)', color: WP.accent, display: 'grid', placeItems: 'center',
          }}>
            <Check size={11} strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: compact ? 13 : 13.5, lineHeight: 1.35, color: 'rgba(255,255,255,.82)' }}>{c}</div>
        </div>
      ))}
    </div>
  )
}

function Chip({ icon, children, solid }: { icon?: React.ReactNode; children: React.ReactNode; solid?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px',
      borderRadius: 12, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
      background: solid ? WP.accent : 'rgba(255,255,255,.06)',
      color: solid ? '#1a0a00' : WP.fg,
      border: solid ? 'none' : `1px solid ${WP.line}`,
    }}>
      {icon && <span style={{ color: solid ? '#1a0a00' : WP.accent, display: 'grid' }}>{icon}</span>}
      {children}
    </div>
  )
}

const glassBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 99, border: '1px solid rgba(255,255,255,.1)',
  background: 'rgba(20,20,20,.55)', color: WP.fg, cursor: 'pointer',
  display: 'grid', placeItems: 'center', flexShrink: 0, touchAction: 'manipulation',
}

function TopBar({ title, onBack, onList }: { title?: string; onBack: () => void; onList?: () => void }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(var(--safe-area-inset-top, 44px) + 10px)',
      left: 0, right: 0, zIndex: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
    }}>
      <button onClick={onBack} style={glassBtn}><ArrowLeft size={20} /></button>
      {title && <div style={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,.92)' }}>{title}</div>}
      {onList
        ? <button onClick={onList} style={glassBtn}><List size={18} /></button>
        : <div style={{ width: 40 }} />
      }
    </div>
  )
}

function TransportControls({ playing, onPrev, onToggle, onNext }: {
  playing: boolean; onPrev: () => void; onToggle: () => void; onNext: () => void
}) {
  const side = (icon: React.ReactNode, fn: () => void) => (
    <button onClick={fn} style={{ width: 56, height: 56, borderRadius: 99, border: 0, cursor: 'pointer', background: 'transparent', color: WP.fg, display: 'grid', placeItems: 'center', touchAction: 'manipulation' }}>
      {icon}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
      {side(<SkipBack size={24} />, onPrev)}
      <button onClick={onToggle} style={{ width: 72, height: 72, borderRadius: 99, border: 0, cursor: 'pointer', background: WP.accent, color: '#1a0a00', display: 'grid', placeItems: 'center', boxShadow: '0 10px 30px rgba(249,115,22,.35)', touchAction: 'manipulation' }}>
        {playing ? <Pause size={32} /> : <Play size={32} />}
      </button>
      {side(<SkipForward size={24} />, onNext)}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

function ReadyScreen({ workout, exercises, onStart, onBack, onSendToWatch, primaryWearable, watchLaunching, watchLaunched }: {
  workout: Workout; exercises: Exercise[]; onStart: () => void; onBack: () => void;
  onSendToWatch: () => void;
  primaryWearable: PrimaryWearable;
  watchLaunching: boolean;
  watchLaunched: boolean;
}) {
  const safeTop = 'calc(var(--safe-area-inset-top, 44px) + 10px)'
  return (
    <div style={{ position: 'absolute', inset: 0, background: WP.bg, color: WP.fg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: `calc(${safeTop} + 52px)`, paddingBottom: 18, paddingInline: 18 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: WP.accent }}>
          Today · {workout.duration_minutes} min
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', margin: '8px 0 6px' }}>{workout.title}</h1>
        {workout.description && (
          <div style={{ fontSize: 13.5, color: WP.dim }}>{workout.description}</div>
        )}

        {/* stats chips */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {[
            { icon: <Dumbbell size={18} />, v: exercises.length, l: 'moves' },
            { icon: <Clock size={18} />, v: workout.duration_minutes, l: 'minutes' },
            { icon: <Flame size={18} />, v: workout.calories_burned || '—', l: 'kcal' },
          ].map(s => (
            <div key={s.l} style={{ flex: 1, background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 16, padding: '14px 12px' }}>
              <div style={{ color: WP.accent }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{s.v}</div>
              <div style={{ fontSize: 11.5, color: WP.dim, marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* plan list */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 12px' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>The plan</div>
          <div style={{ fontSize: 12.5, color: WP.dim }}>{exercises.length} moves</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercises.map((ex, i) => (
            <div key={ex.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 16, padding: 10 }}>
              <div style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
                <ExerciseThumb exercise={ex} style={{ width: 58, height: 58, borderRadius: 12 }} />
                <div style={{ position: 'absolute', top: 4, left: 4, width: 22, height: 22, borderRadius: 99, background: WP.bg, border: `1px solid ${WP.line}`, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: WP.accent }}>
                  {i + 1}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{ex.title}</div>
                <div style={{ fontSize: 12.5, color: WP.dim, marginTop: 2 }}>{ex.body_area}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: 'rgba(255,255,255,.05)', border: `1px solid ${WP.line}`, color: 'rgba(255,255,255,.85)', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                <span style={{ color: WP.accent, display: 'grid' }}>
                  {exMode(ex) === 'time' ? <Clock size={14} /> : <Repeat2 size={14} />}
                </span>
                {exMode(ex) === 'time' ? `${ex.duration_seconds || 45}s` : `${ex.reps}×${ex.sets}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* pinned footer */}
      <div style={{ flexShrink: 0, padding: '16px 18px 30px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1px solid ${WP.line}`, background: WP.bg }}>
        {Capacitor.isNativePlatform() && exercises.length > 0 && (
          <WearableLaunchCard
            wearable={primaryWearable}
            activityType="structured"
            tokens={{ card: WP.surface, line2: WP.line2, fg: WP.fg, dim: WP.dim, good: WP.good, gold: WP.gold }}
            tint={tintWP}
            onLaunchAppleWatch={onSendToWatch}
            watchLaunching={watchLaunching}
            watchLaunched={watchLaunched}
          />
        )}
        <button onClick={onStart} style={{ width: '100%', height: 58, borderRadius: 18, border: 0, cursor: 'pointer', background: WP.accent, color: '#1a0a00', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 26px rgba(249,115,22,.3)', touchAction: 'manipulation' }}>
          <Play size={18} /> Start workout
        </button>
      </div>

      {/* back button */}
      <button onClick={onBack} style={{ ...glassBtn, position: 'absolute', top: safeTop, left: 14, zIndex: 30 }}>
        <ArrowLeft size={20} />
      </button>
    </div>
  )
}

function CountdownScreen({ n, firstExercise }: { n: number; firstExercise: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: WP.bg, color: WP.fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: WP.dim, marginBottom: 18 }}>Starting in</div>
      <div style={{ fontSize: 150, fontWeight: 800, color: WP.accent, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
      <div style={{ marginTop: 22, fontSize: 15, color: WP.dim }}>First up · <span style={{ color: WP.fg, fontWeight: 700 }}>{firstExercise}</span></div>
    </div>
  )
}

function GetReadyScreen({ exercise, idx, total, onBegin, onBack, onList }: {
  exercise: Exercise; idx: number; total: number; onBegin: () => void; onBack: () => void; onList: () => void
}) {
  const cues = exCues(exercise)
  const safeTop = 'calc(var(--safe-area-inset-top, 44px) + 10px)'
  return (
    <div style={{ position: 'absolute', inset: 0, background: WP.bg, color: WP.fg, overflow: 'auto' }}>
      <TopBar title={`Move ${idx + 1} of ${total}`} onBack={onBack} onList={onList} />
      <div style={{ paddingTop: `calc(${safeTop} + 60px)`, paddingInline: 18, paddingBottom: 150 }}>
        <div style={{ marginBottom: 14 }}><StepRail idx={idx} total={total} /></div>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: WP.accent }}>Get ready</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', margin: '6px 0 14px' }}>{exercise.title}</h1>

        {/* photo */}
        <div style={{ position: 'relative', width: '100%', height: 230, borderRadius: 20, overflow: 'hidden' }}>
          <ExerciseThumb exercise={exercise} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 20 }} />
        </div>

        {/* chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <Chip icon={exMode(exercise) === 'time' ? <Clock size={15} /> : <Repeat2 size={15} />} solid>
            {exLabel(exercise)}
          </Chip>
          {exercise.body_area && <Chip>{exercise.body_area}</Chip>}
        </div>

        {/* form cues */}
        {cues.length > 0 && (
          <>
            <div style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: WP.dim, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>How to do it</div>
            <Cues cues={cues} />
          </>
        )}
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 18px', paddingBottom: 'calc(var(--safe-area-inset-bottom, 16px) + 20px)', background: `linear-gradient(rgba(10,10,10,0), ${WP.bg} 32%)` }}>
        <button onClick={onBegin} style={{ width: '100%', height: 58, borderRadius: 18, border: 0, cursor: 'pointer', background: WP.accent, color: '#1a0a00', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, touchAction: 'manipulation' }}>
          I&apos;m ready <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}

function ActiveScreen({ exercise, idx, total, setNum, playing, timeLeft, cuesOpen, onToggleCues, onBack, onList, onPrev, onToggle, onNext, onCompleteSet, onHoldFinish }: {
  exercise: Exercise; idx: number; total: number; setNum: number; playing: boolean
  timeLeft: number; cuesOpen: boolean; onToggleCues: () => void
  onBack: () => void; onList: () => void; onPrev: () => void; onToggle: () => void; onNext: () => void
  onCompleteSet: () => void; onHoldFinish: () => void
  nextExercise?: Exercise
}) {
  const mode = exMode(exercise)
  const cues = exCues(exercise)

  const [setTimer, setSetTimer] = useState(0)
  useEffect(() => { setSetTimer(0) }, [setNum, idx])
  useEffect(() => {
    if (!playing) return
    const h = setInterval(() => setSetTimer(s => s + 1), 1000)
    return () => clearInterval(h)
  }, [playing, setNum, idx])

  const completeLabel = mode === 'reps'
    ? (setNum + 1 >= (exercise.sets || 1) ? 'Exercise complete' : `Set ${setNum + 1} done`)
    : 'Done early'

  return (
    <div style={{ position: 'absolute', inset: 0, background: WP.bg, color: WP.fg, display: 'flex', flexDirection: 'column' }}>
      {/* photo hero */}
      <div style={{ position: 'relative', height: 340, flexShrink: 0 }}>
        <ExerciseMedia exercise={exercise} isPaused={!playing} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,.5) 0%, rgba(10,10,10,0) 26%, rgba(10,10,10,.55) 78%, #0a0a0a 100%)' }} />
        <TopBar title={`Move ${idx + 1} of ${total}`} onBack={onBack} onList={onList} />
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
          <div style={{ marginBottom: 12 }}><StepRail idx={idx} total={total} /></div>
          <div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{exercise.body_area}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.01em', marginTop: 2 }}>{exercise.title}</div>
          </div>
        </div>
      </div>

      {/* metric panel */}
      <div style={{ flex: 1, minHeight: 0, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* big metric */}
        <div>
          {mode === 'reps' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{exercise.reps}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: WP.dim }}>reps</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <SetDots total={exercise.sets || 1} done={setNum} />
                <span style={{ fontSize: 13, color: WP.dim, fontWeight: 600 }}>Set {Math.min(setNum + 1, exercise.sets || 1)} of {exercise.sets || 1}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: WP.fg, marginTop: 14, letterSpacing: '-.01em' }}>{fmt(setTimer)}</div>
              <div style={{ fontSize: 12, color: WP.dim, fontWeight: 600, marginTop: 2 }}>elapsed this set</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{fmt(timeLeft)}</div>
              <div style={{ fontSize: 13, color: WP.dim, fontWeight: 600, marginTop: 10 }}>{exercise.duration_seconds || 45}s · keep going</div>
            </>
          )}
        </div>

        {/* form cues — tap to reveal */}
        {cues.length > 0 && (
          <>
            <button onClick={onToggleCues} style={{ display: 'flex', alignItems: 'center', gap: 10, background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 14, padding: '12px 14px', color: WP.fg, fontFamily: 'inherit', cursor: 'pointer', width: '100%', textAlign: 'left', touchAction: 'manipulation' }}>
              <span style={{ color: WP.accent, display: 'grid' }}><Info size={18} /></span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Form cues</span>
              <span style={{ color: WP.dim, transform: cuesOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s', display: 'grid' }}><ChevronRight size={16} /></span>
            </button>
            {cuesOpen && (
              <div style={{ background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 16, padding: 14, marginTop: -6 }}>
                <Cues cues={cues} compact />
              </div>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />
      </div>

      {/* controls */}
      <div style={{ padding: '10px 18px', paddingBottom: 'calc(var(--safe-area-inset-bottom, 16px) + 10px)', display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
        <CompleteButton label={completeLabel} onComplete={mode === 'reps' ? onCompleteSet : onHoldFinish} />
        <TransportControls playing={playing} onPrev={onPrev} onToggle={onToggle} onNext={onNext} />
      </div>
    </div>
  )
}

function RestScreen({ exercise, idx, total, restLeft, onAddTime, onSkip, onBack, onList }: {
  exercise: Exercise; idx: number; total: number; restLeft: number
  onAddTime: () => void; onSkip: () => void; onBack: () => void; onList: () => void
}) {
  const cues = exCues(exercise)
  const frac = Math.max(0, restLeft / REST_SECS)
  const r = (200 - 8) / 2
  const circ = 2 * Math.PI * r

  return (
    <div style={{ position: 'absolute', inset: 0, background: WP.bg, color: WP.fg, display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Rest" onBack={onBack} onList={onList} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 18px', paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 60px)' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: WP.dim, marginBottom: 22 }}>Rest · breathe</div>

        {/* ring */}
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={100} cy={100} r={r} stroke="rgba(255,255,255,.1)" strokeWidth={8} fill="none" />
            <circle cx={100} cy={100} r={r} stroke={WP.accent} strokeWidth={8} fill="none"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)}
              style={{ transition: 'stroke-dashoffset .9s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 52, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{restLeft}</div>
              <div style={{ fontSize: 12.5, color: WP.dim, marginTop: 4 }}>seconds</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          <button onClick={onAddTime} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 13, background: WP.surface, border: `1px solid ${WP.line}`, color: WP.fg, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', touchAction: 'manipulation' }}>
            <Plus size={16} /> 20s
          </button>
          <button onClick={onSkip} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 13, background: WP.accent, border: 0, color: '#1a0a00', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation' }}>
            Skip rest <SkipForward size={16} />
          </button>
        </div>
      </div>

      {/* up next */}
      <div style={{ padding: '0 18px', paddingBottom: 'calc(var(--safe-area-inset-bottom, 16px) + 16px)', flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: WP.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Up next · {idx + 1} of {total}
        </div>
        <div style={{ background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 18, padding: 14, display: 'flex', gap: 14 }}>
          <ExerciseThumb exercise={exercise} style={{ width: 84, height: 84, borderRadius: 14 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{exercise.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <Chip icon={exMode(exercise) === 'time' ? <Clock size={14} /> : <Repeat2 size={14} />} solid>
                {exLabel(exercise)}
              </Chip>
            </div>
            {cues.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <Cues cues={cues.slice(0, 2)} compact />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PlaylistSheet({ exercises, idx, onJump, onClose, onFormCheck }: {
  exercises: Exercise[]; idx: number; onJump: (i: number) => void; onClose: () => void; onFormCheck: () => void
}) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '78%', background: WP.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, border: `1px solid ${WP.line}`, padding: '14px 18px', paddingBottom: 'calc(var(--safe-area-inset-bottom, 16px) + 14px)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: '#3a3a3a', margin: '0 auto 16px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>All moves</h3>
          <span style={{ fontSize: 12.5, color: WP.dim }}>{idx} of {exercises.length} done</span>
        </div>
        <div style={{ fontSize: 13, color: WP.dim, marginBottom: 16, flexShrink: 0 }}>Tap any move to jump to it.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {exercises.map((ex, i) => {
            const done = i < idx, current = i === idx
            return (
              <button key={ex.id} onClick={() => onJump(i)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, borderRadius: 16, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation', background: current ? 'rgba(249,115,22,.1)' : WP.surface, border: current ? `1px solid ${WP.accent}` : `1px solid ${WP.line}` }}>
                <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                  <ExerciseThumb exercise={ex} style={{ width: 56, height: 56, borderRadius: 12, opacity: done ? 0.5 : 1 }} />
                  {done && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(10,10,10,.45)', display: 'grid', placeItems: 'center', color: WP.accent }}>
                      <Check size={22} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: done ? WP.dim : WP.fg }}>{ex.title}</div>
                  <div style={{ fontSize: 12.5, color: WP.dim, marginTop: 2 }}>{ex.body_area}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 99, background: 'rgba(255,255,255,.05)', border: `1px solid ${WP.line}`, fontSize: 12.5, fontWeight: 700, flexShrink: 0, color: current ? WP.accent : 'rgba(255,255,255,.85)' }}>
                  {exMode(ex) === 'time' ? <Clock size={14} /> : <Repeat2 size={14} />}
                  {exMode(ex) === 'time' ? `${ex.duration_seconds || 45}s` : `${ex.reps}×${ex.sets}`}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function WorkoutPlayer() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const { recordWorkout, newBadges, clearNewBadges } = useStreaksAndBadges()
  const [pointsEarned, setPointsEarned] = useState(0)
  const { wearable: primaryWearable } = usePrimaryWearable()
  const [watchLaunching, setWatchLaunching] = useState(false)
  const [watchLaunched, setWatchLaunched] = useState(false)

  // data
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])

  // player state machine
  const [view, setView] = useState<WPView>('ready')
  const [idx, setIdx] = useState(0)
  const [setNum, setSetNum] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [timeLeft, setTimeLeft] = useState(0)
  const [restLeft, setRestLeft] = useState(REST_SECS)
  const [countdown, setCountdown] = useState(3)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const [cuesOpen, setCuesOpen] = useState(false)
  const prevView = useRef<WPView>('ready')

  // completion
  const [rating, setRating] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showFormAnalysis, setShowFormAnalysis] = useState(false)
  const [detectedPBs, setDetectedPBs] = useState<DetectedPB[]>([])

  const currentEx = exercises[idx]

  useEffect(() => {
    if (id) fetchWorkoutData()
  }, [id])

  // reset per-exercise state when idx changes
  useEffect(() => {
    if (!currentEx) return
    setTimeLeft(currentEx.duration_seconds || 45)
    setSetNum(0)
    setCuesOpen(false)
  }, [idx])

  // countdown 3-2-1
  useEffect(() => {
    if (view !== 'countdown') return
    if (countdown <= 0) {
      setView('active')
      setPlaying(true)
      return
    }
    const h = setTimeout(() => setCountdown(c => c - 1), 850)
    return () => clearTimeout(h)
  }, [view, countdown])

  // active timer (timed exercises only)
  useEffect(() => {
    if (view !== 'active' || !playing || !currentEx || exMode(currentEx) !== 'time') return
    const h = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { goNext(); return currentEx.duration_seconds || 45 }
        return t - 1
      })
      setTotalElapsed(t => t + 1)
    }, 1000)
    return () => clearInterval(h)
  }, [view, playing, idx, currentEx])

  // elapsed ticker (reps-based — count total time)
  useEffect(() => {
    if (view !== 'active' || !playing || !currentEx || exMode(currentEx) !== 'reps') return
    const h = setInterval(() => setTotalElapsed(t => t + 1), 1000)
    return () => clearInterval(h)
  }, [view, playing, idx, currentEx])

  // rest timer
  useEffect(() => {
    if (view !== 'rest') return
    if (restLeft <= 0) { setView('active'); setPlaying(true); return }
    const h = setTimeout(() => setRestLeft(s => s - 1), 1000)
    return () => clearTimeout(h)
  }, [view, restLeft])

  // ── data ──────────────────────────────────────────────────────────────────
  const fetchWorkoutData = async () => {
    try {
      const [{ data: workoutData }, { data: exercisesData }] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', id).single(),
        supabase.from('workout_exercises').select('*').eq('workout_id', id).order('order_index'),
      ])
      if (workoutData) {
        setWorkout(workoutData)
        startWorkoutMirroring('hiit', workoutData.title)
        sendWorkoutToWatch({
          id: workoutData.id,
          name: workoutData.title,
          durationMinutes: workoutData.duration_minutes ?? 30,
          exercises: (exercisesData ?? []).map(ex => ({
            id: ex.id, name: ex.title,
            sets: ex.sets ?? undefined, reps: ex.reps ?? undefined,
            durationSeconds: ex.duration_seconds ?? undefined,
          })),
        })
      }
      if (exercisesData && exercisesData.length > 0) {
        setExercises(exercisesData)
        setTimeLeft(exercisesData[0].duration_seconds || 45)
      }
    } catch (err) {
      console.error('WorkoutPlayer fetch error:', err)
    }
  }

  const sendToWatch = async () => {
    if (!workout || !exercises.length || watchLaunching || watchLaunched) return
    setWatchLaunching(true)
    try {
      await sendStructuredWorkoutToWatch({
        id: workout.id, name: workout.title,
        durationMinutes: workout.duration_minutes,
        exercises: exercises.map(ex => ({
          id: ex.id, name: ex.title,
          sets: ex.sets ?? undefined, reps: ex.reps ?? undefined,
          durationSeconds: ex.duration_seconds ?? undefined,
        })),
      })
      setWatchLaunched(true)
      toast({ title: 'Sent to Apple Watch', description: 'Open your Watch to begin.' })
    } catch {
      toast({ title: "Couldn't send to Apple Watch", description: 'Make sure the HITT Watch app is installed.' })
    } finally {
      setWatchLaunching(false)
    }
  }

  // ── transitions ───────────────────────────────────────────────────────────
  const startWorkout = () => {
    setIdx(0)
    setView('getready')
  }

  const goNext = () => {
    if (idx >= exercises.length - 1) { completeWorkout(); return }
    const n = idx + 1
    setIdx(n)
    setSetNum(0)
    setTimeLeft(exercises[n].duration_seconds || 45)
    setRestLeft(REST_SECS)
    setView('rest')
  }

  const completeSet = () => {
    if (setNum + 1 >= (currentEx?.sets || 1)) {
      goNext()
    } else {
      setSetNum(s => s + 1)
    }
  }

  const openList = () => {
    prevView.current = view === 'playlist' ? 'active' : view
    setView('playlist')
  }

  const jumpTo = (i: number) => {
    setIdx(i)
    setView('active')
    setPlaying(true)
  }

  // ── completion ────────────────────────────────────────────────────────────
  const workoutDurationMin = Math.floor(totalElapsed / 60)
  const metValue = (workout as any)?.met_value ?? 5.0
  const userWeightKg = 75
  const workoutCalories = workout?.calories_burned || Math.round(metValue * userWeightKg * (workoutDurationMin / 60))

  const detectPBs = async (userId: string, newDurSec: number, newCal: number): Promise<DetectedPB[]> => {
    const pbs: DetectedPB[] = []
    try {
      const { data: durMax } = await supabase.from('workout_progress').select('duration_seconds').eq('user_id', userId).order('duration_seconds', { ascending: false }).limit(2)
      const prevDur = durMax?.[1]?.duration_seconds ?? 0
      if (prevDur > 0 && newDurSec > prevDur) pbs.push({ kind: 'duration', label: 'longest workout', value: Math.round(newDurSec / 60), previousBest: Math.round(prevDur / 60) })

      const { data: calMax } = await supabase.from('workout_progress').select('calories_burned').eq('user_id', userId).not('calories_burned', 'is', null).order('calories_burned', { ascending: false }).limit(2)
      const prevCal = calMax?.[1]?.calories_burned ?? 0
      if (prevCal > 0 && newCal > prevCal) pbs.push({ kind: 'calories', label: 'biggest calorie burn', value: Math.round(newCal), previousBest: Math.round(prevCal) })

      const { data: streaks } = await supabase.from('user_streaks').select('current_streak, longest_streak').eq('user_id', userId).maybeSingle()
      if (streaks?.longest_streak > 0 && streaks.current_streak > streaks.longest_streak)
        pbs.push({ kind: 'streak', label: `${streaks.current_streak}-day streak`, value: streaks.current_streak, previousBest: streaks.longest_streak })
    } catch (err) {
      console.error('[PB Detection] failed:', err)
    }
    return pbs
  }

  const completeWorkout = async () => {
    setShowCompleted(true)
    endWorkoutMirroring()
    if (user && workout) {
      try {
        const snapshot = exercises.map(ex => ({
          title: ex.title, description: ex.description ?? null,
          duration_seconds: ex.duration_seconds ?? null, sets: ex.sets ?? null,
          reps: ex.reps ?? null, order_index: ex.order_index,
          body_area: ex.body_area ?? null, thumbnail_url: ex.thumbnail_url ?? null,
          video_url: ex.video_url ?? null,
        }))
        await supabase.from('workout_progress').insert({
          user_id: user.id, workout_id: workout.id, workout_source: 'catalogue',
          workout_title: workout.title, workout_description: workout.description ?? null,
          exercises_snapshot: snapshot, estimated_duration_minutes: workout.duration_minutes ?? null,
          estimated_calories: workout.calories_burned ?? null,
          duration_seconds: totalElapsed, calories_burned: workoutCalories,
        })
        const pts = await recordWorkout()
        setPointsEarned(pts)
        const pbs = await detectPBs(user.id, totalElapsed, workoutCalories)
        setDetectedPBs(pbs)
        if (pbs.length > 0) {
          const nid = await schedulePBShareReminder(workout.id, workout.title, pbs.map(pb => ({ kind: pb.kind, label: pb.label, value: pb.value })))
          if (nid !== null) sessionStorage.setItem(`pb_notif_${workout.id}`, String(nid))
        }
        setTimeout(() => notifyUser(user.id, 'workout', 'Workout complete! 💪', `You finished ${workout.title}. Great work!`, '/home'), 3000)
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('hitt:open-jarvis-share', {
            detail: {
              workoutId: workout.id,
              workoutTitle: workout.title,
              durationMin: workoutDurationMin,
              calories: workoutCalories,
              // Structured HIIT — force the hiit template (intervals curve).
              activityType: 'hiit',
              startedAt: new Date().toISOString(),
              pbs,
            },
          }))
        }, 8000)
      } catch (err) {
        console.error('Error saving progress:', err)
      }
    }
  }

  const handleFinish = () => {
    clearNewBadges()
    toast({ title: 'Great workout!', description: 'Your progress has been saved.' })
    navigate('/home')
  }

  // ── render paths ──────────────────────────────────────────────────────────

  if (showCompleted) {
    const completionStats = [
      { label: 'Duration', value: workoutDurationMin, unit: 'min' },
      { label: 'Calories', value: workoutCalories, unit: 'kcal' },
      { label: 'Exercises', value: exercises.length },
    ]
    const ratingSection = (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>How was the workout?</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button key={star} onClick={() => setRating(star)} style={{ fontSize: 30, background: 'none', border: 0, cursor: 'pointer', padding: 0, touchAction: 'manipulation' }}>
              {star <= rating ? '⭐' : '☆'}
            </button>
          ))}
        </div>
      </div>
    )
    return (
      <>
        <CompletionSummary
          activityTitle={workout?.title || 'Workout'}
          stats={completionStats}
          achievementMessage={detectedPBs.length > 0 ? `🏆 New PB — ${detectedPBs.map(pb => pb.label).join(' + ')}!` : newBadges.length > 0 ? 'New achievement unlocked!' : undefined}
          pbLabel={detectedPBs.length > 0 ? detectedPBs.map(pb => pb.label).join(' + ') : undefined}
          badges={newBadges.map(b => ({ name: b.name, icon: b.icon }))}
          pointsEarned={pointsEarned}
          onDone={handleFinish}
          ratingSection={ratingSection}
          postData={{ duration: workoutDurationMin, calories: workoutCalories, type: workout?.title || 'Workout' }}
        />
        <NewBadgeModal badges={newBadges} onClose={clearNewBadges} />
      </>
    )
  }

  // loading / no data
  if (!workout) {
    return (
      <div style={{ height: '100dvh', background: WP.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: WP.dim, fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', background: WP.bg, position: 'relative', overflow: 'hidden' }}>

      {view === 'ready' && (
        <ReadyScreen
          workout={workout} exercises={exercises}
          onStart={startWorkout} onBack={() => navigate(-1)} onSendToWatch={sendToWatch}
          primaryWearable={primaryWearable}
          watchLaunching={watchLaunching}
          watchLaunched={watchLaunched}
        />
      )}

      {view === 'countdown' && (
        <CountdownScreen n={countdown} firstExercise={exercises[0]?.title || ''} />
      )}

      {view === 'getready' && currentEx && (
        <GetReadyScreen
          exercise={currentEx} idx={idx} total={exercises.length}
          onBegin={() => { setCountdown(3); setView('countdown') }}
          onBack={() => setView('ready')} onList={openList}
        />
      )}

      {view === 'active' && currentEx && (
        <ActiveScreen
          exercise={currentEx} idx={idx} total={exercises.length}
          setNum={setNum} playing={playing} timeLeft={timeLeft}
          cuesOpen={cuesOpen} onToggleCues={() => setCuesOpen(v => !v)}
          onBack={() => setView('ready')} onList={openList}
          onPrev={() => { if (idx > 0) { setIdx(idx - 1); setView('active'); setPlaying(true) } }}
          onToggle={() => setPlaying(p => !p)}
          onNext={goNext}
          onCompleteSet={completeSet}
          onHoldFinish={goNext}
        />
      )}

      {view === 'rest' && currentEx && (
        <RestScreen
          exercise={currentEx} idx={idx} total={exercises.length}
          restLeft={restLeft}
          onAddTime={() => setRestLeft(s => s + 20)}
          onSkip={() => { setView('active'); setPlaying(true) }}
          onBack={() => setView('ready')} onList={openList}
        />
      )}

      {/* playlist overlay — renders on top of whatever the current view is */}
      {view === 'playlist' && (
        <PlaylistSheet
          exercises={exercises} idx={idx}
          onJump={jumpTo}
          onClose={() => setView(prevView.current)}
          onFormCheck={() => { setView(prevView.current); setShowFormAnalysis(true) }}
        />
      )}

      <AIFormAnalysis
        exerciseName={currentEx?.title || workout?.title || 'Exercise'}
        isOpen={showFormAnalysis}
        onClose={() => setShowFormAnalysis(false)}
      />

      <NewBadgeModal badges={newBadges} onClose={clearNewBadges} />
    </div>
  )
}
