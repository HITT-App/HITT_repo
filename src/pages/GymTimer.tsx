import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import {
  ArrowLeft, Pause, Play, Plus, Minus, Settings, ChevronDown, ChevronUp, Flame,
  SkipBack, SkipForward, Info, ChevronRight, Check, List, Dumbbell, Clock, ArrowRight, Repeat2, Watch, Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useActivity } from "@/hooks/useActivity"
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges"
import { usePrimaryWearable } from "@/hooks/usePrimaryWearable"
import { WearableLaunchCard } from "@/components/wearable/WearableLaunchCard"
import { startWorkoutMirroring } from "@/plugins/WatchPlugin"
import type { PrimaryWearable } from "@/lib/wearable-detection"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import { CompletionSummary } from "@/components/workout/CompletionSummary"
import { getSportConfig } from "@/lib/sports"
import type { ExerciseSnapshot } from "@/integrations/supabase/types"
import { Capacitor } from "@capacitor/core"

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

const DEFAULT_WEIGHT_KG = 70

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(sec).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ── AI workout state passed via location.state.aiWorkout ──────────────────────
type AIWorkoutPayload = {
  title: string
  description?: string
  exercises_snapshot: ExerciseSnapshot[]
  estimated_duration_minutes: number
  estimated_calories: number
}

// ── Scheduled workout row shape ───────────────────────────────────────────────
type ScheduledWorkoutRow = {
  id: string
  workout_source: string
  workout_title: string | null
  workout_description: string | null
  exercises_snapshot: ExerciseSnapshot[] | null
  estimated_duration_minutes: number | null
  estimated_calories: number | null
}

// ── exercise helpers ───────────────────────────────────────────────────────────
const exMode = (ex: ExerciseSnapshot) => (ex.sets && ex.reps) ? 'reps' as const : 'time' as const

const exCues = (ex: ExerciseSnapshot): string[] => {
  if (!ex.description) return []
  return ex.description.split(/[.\n]/).map(s => s.trim()).filter(Boolean).slice(0, 3)
}

const exLabel = (ex: ExerciseSnapshot) =>
  exMode(ex) === 'time'
    ? `${ex.duration_seconds || 45}s hold`
    : `${ex.reps} reps × ${ex.sets} sets`

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

// ── sub-components ─────────────────────────────────────────────────────────────

function ExerciseThumb({ exercise, style }: { exercise: ExerciseSnapshot; style?: React.CSSProperties }) {
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
// AI MODE SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

type AIWorkoutMeta = {
  title: string
  duration_minutes: number
  calories_burned: number
  description?: string
}

function ReadyScreen({ workout, exercises, onStart, onBack, primaryWearable, onLaunchAppleWatch, watchLaunching, watchLaunched }: {
  workout: AIWorkoutMeta; exercises: ExerciseSnapshot[]; onStart: () => void; onBack: () => void;
  primaryWearable: PrimaryWearable;
  onLaunchAppleWatch: () => void;
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
            <div key={ex.order_index} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13, background: WP.surface, border: `1px solid ${WP.line}`, borderRadius: 16, padding: 10 }}>
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
        {Capacitor.isNativePlatform() && (
          <WearableLaunchCard
            wearable={primaryWearable}
            activityType="gym"
            tokens={{ card: WP.surface, line2: WP.line2, fg: WP.fg, dim: WP.dim, good: WP.good, gold: WP.gold }}
            tint={tintWP}
            onLaunchAppleWatch={onLaunchAppleWatch}
            watchLaunching={watchLaunching}
            watchLaunched={watchLaunched}
          />
        )}
        <button onClick={onStart} style={{ width: '100%', height: 58, borderRadius: 18, border: 0, cursor: 'pointer', background: WP.accent, color: '#1a0a00', fontSize: 17, fontWeight: 800, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 8px 26px rgba(249,115,22,.3)', touchAction: 'manipulation' }}>
          <Play size={18} /> Start workout
        </button>
      </div>

      {/* back button */}
      <button onClick={onBack} style={{ ...glassBtn, position: 'absolute', top: 'calc(var(--safe-area-inset-top, 44px) + 10px)', left: 14, zIndex: 30 }}>
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
  exercise: ExerciseSnapshot; idx: number; total: number; onBegin: () => void; onBack: () => void; onList: () => void
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
  exercise: ExerciseSnapshot; idx: number; total: number; setNum: number; playing: boolean
  timeLeft: number; cuesOpen: boolean; onToggleCues: () => void
  onBack: () => void; onList: () => void; onPrev: () => void; onToggle: () => void; onNext: () => void
  onCompleteSet: () => void; onHoldFinish: () => void
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
        <ExerciseThumb exercise={exercise} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
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
  exercise: ExerciseSnapshot; idx: number; total: number; restLeft: number
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

function PlaylistSheet({ exercises, idx, onJump, onClose }: {
  exercises: ExerciseSnapshot[]; idx: number; onJump: (i: number) => void; onClose: () => void
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
              <button key={ex.order_index} onClick={() => onJump(i)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 11, borderRadius: 16, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation', background: current ? 'rgba(249,115,22,.1)' : WP.surface, border: current ? `1px solid ${WP.accent}` : `1px solid ${WP.line}` }}>
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

const GymTimer = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { user } = useAuth()

  // ─── Mode detection ──────────────────────────────────────────────────────
  const scheduledId = searchParams.get("scheduled_id")
  const adhocWorkout = (location.state as { aiWorkout?: AIWorkoutPayload } | null)?.aiWorkout
  const isAIMode = !!(scheduledId || adhocWorkout)

  // Mode C: existing freeform sport (unchanged)
  const activityType = searchParams.get("sport") || "Workout"
  const sport = getSportConfig(activityType)

  const { logActivity } = useActivity()
  const { recordWorkout } = useStreaksAndBadges()

  // ─── Scheduled row (Mode A only) ─────────────────────────────────────────
  const [scheduledRow, setScheduledRow] = useState<ScheduledWorkoutRow | null>(null)

  // ─── Wearable launch ──────────────────────────────────────────────────────
  const { wearable: primaryWearable } = usePrimaryWearable()
  const [watchLaunching, setWatchLaunching] = useState(false)
  const [watchLaunched, setWatchLaunched] = useState(false)
  const launchOnAppleWatch = async () => {
    if (watchLaunching || watchLaunched) return
    setWatchLaunching(true)
    try {
      const ok = await startWorkoutMirroring('gym', 'Gym session')
      if (ok) setWatchLaunched(true)
      else toast({ title: "Couldn't start on Apple Watch", description: "Make sure the HITT Watch app is installed." })
    } catch {
      toast({ title: "Couldn't start on Apple Watch", description: "Make sure the HITT Watch app is installed." })
    } finally {
      setWatchLaunching(false)
    }
  }

  // Resolved AI workout content
  const aiContent: AIWorkoutPayload | null = scheduledRow
    ? {
        title: scheduledRow.workout_title ?? "Workout",
        description: scheduledRow.workout_description ?? undefined,
        exercises_snapshot: scheduledRow.exercises_snapshot ?? [],
        estimated_duration_minutes: scheduledRow.estimated_duration_minutes ?? 30,
        estimated_calories: scheduledRow.estimated_calories ?? 0,
      }
    : adhocWorkout ?? null

  // ─── AI mode state machine ───────────────────────────────────────────────
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

  const exercises: ExerciseSnapshot[] = aiContent?.exercises_snapshot ?? []
  const currentEx = exercises[idx]

  // ─── Mode C state ────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [counter, setCounter] = useState(0)
  const [settings, setSettings] = useState({ autoVibrate: true, showCalories: true })
  const [pointsEarned, setPointsEarned] = useState(0)

  const startTimeRef = useRef(Date.now())
  const pausedAtRef = useRef(0)

  const calories = isAIMode
    ? Math.round(((aiContent?.estimated_calories ?? 200) / ((aiContent?.estimated_duration_minutes ?? 30) * 60)) * totalElapsed)
    : Math.round((sport.met * DEFAULT_WEIGHT_KG * elapsed) / 3600)

  const IconComp = sport.icon
  const counterLabel = sport.counterLabel

  // ─── Load scheduled row (Mode A) ─────────────────────────────────────────
  useEffect(() => {
    if (!scheduledId) return
    supabase
      .from("scheduled_workouts")
      .select("id, workout_source, workout_title, workout_description, exercises_snapshot, estimated_duration_minutes, estimated_calories")
      .eq("id", scheduledId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Couldn't load workout"); return }
        setScheduledRow(data as ScheduledWorkoutRow)
      })
  }, [scheduledId])

  // ─── AI mode: reset per-exercise state when idx changes ─────────────────
  useEffect(() => {
    if (!isAIMode || !currentEx) return
    setTimeLeft(currentEx.duration_seconds || 45)
    setSetNum(0)
    setCuesOpen(false)
  }, [idx, isAIMode])

  // ─── AI mode: countdown 3-2-1 ───────────────────────────────────────────
  useEffect(() => {
    if (!isAIMode || view !== 'countdown') return
    if (countdown <= 0) {
      setView('active')
      setPlaying(true)
      return
    }
    const h = setTimeout(() => setCountdown(c => c - 1), 850)
    return () => clearTimeout(h)
  }, [view, countdown, isAIMode])

  // ─── AI mode: active timer (timed exercises only) ────────────────────────
  useEffect(() => {
    if (!isAIMode || view !== 'active' || !playing || !currentEx || exMode(currentEx) !== 'time') return
    const h = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { goNext(); return currentEx.duration_seconds || 45 }
        return t - 1
      })
      setTotalElapsed(t => t + 1)
    }, 1000)
    return () => clearInterval(h)
  }, [view, playing, idx, currentEx, isAIMode])

  // ─── AI mode: elapsed ticker for reps-based exercises ───────────────────
  useEffect(() => {
    if (!isAIMode || view !== 'active' || !playing || !currentEx || exMode(currentEx) !== 'reps') return
    const h = setInterval(() => setTotalElapsed(t => t + 1), 1000)
    return () => clearInterval(h)
  }, [view, playing, idx, currentEx, isAIMode])

  // ─── AI mode: rest timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAIMode || view !== 'rest') return
    if (restLeft <= 0) { setView('active'); setPlaying(true); return }
    const h = setTimeout(() => setRestLeft(s => s - 1), 1000)
    return () => clearTimeout(h)
  }, [view, restLeft, isAIMode])

  // ─── Mode C timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAIMode || showCompleted) return
    const id = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedAtRef.current)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isAIMode, isPaused, showCompleted])

  // ─── AI mode transitions ─────────────────────────────────────────────────
  const startWorkout = () => {
    setIdx(0)
    setView('getready')
  }

  const goNext = () => {
    if (idx >= exercises.length - 1) { finishActivity(); return }
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

  // ─── Mode C controls ─────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    if (isPaused) {
      startTimeRef.current += Date.now() - (startTimeRef.current + (pausedAtRef.current + elapsed) * 1000)
    }
    setIsPaused(p => {
      if (!p) pausedAtRef.current += 0
      return !p
    })
    if (settings.autoVibrate) navigator.vibrate?.(50)
  }, [isPaused, elapsed, settings.autoVibrate])

  // ─── Shared finish / completion ──────────────────────────────────────────
  const finishActivity = useCallback(async () => {
    setShowCompleted(true)
    if (settings.autoVibrate) navigator.vibrate?.([100, 50, 100, 50, 200])
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } })

    const durationSecs = isAIMode ? totalElapsed : elapsed
    const finalCalories = isAIMode
      ? Math.round(((aiContent?.estimated_calories ?? 200) / ((aiContent?.estimated_duration_minutes ?? 30) * 60)) * totalElapsed)
      : Math.round((sport.met * DEFAULT_WEIGHT_KG * elapsed) / 3600)

    try {
      if (isAIMode && aiContent && user) {
        await supabase.from("workout_progress").insert({
          user_id: user.id,
          workout_id: null,
          workout_source: "ai_generated",
          workout_title: aiContent.title,
          workout_description: aiContent.description ?? null,
          exercises_snapshot: aiContent.exercises_snapshot,
          estimated_duration_minutes: aiContent.estimated_duration_minutes,
          estimated_calories: aiContent.estimated_calories,
          duration_seconds: durationSecs,
          calories_burned: finalCalories,
        })

        if (scheduledId) {
          await supabase
            .from("scheduled_workouts")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              duration_minutes: Math.round(durationSecs / 60),
              calories_burned: finalCalories,
            })
            .eq("id", scheduledId)
        }
      } else {
        await logActivity.mutateAsync({
          activity_type: activityType,
          duration_seconds: elapsed,
          calories_burned: finalCalories,
          notes: counter > 0 ? `${counter} ${counterLabel.toLowerCase()} completed` : undefined,
        })
      }

      const pts = await recordWorkout()
      setPointsEarned(pts)
    } catch {
      toast.error("Failed to save activity")
    }
  }, [isAIMode, aiContent, user, totalElapsed, elapsed, scheduledId, activityType, counter, counterLabel, logActivity, settings.autoVibrate, recordWorkout, sport.met])

  // ─── Loading state (Mode A: scheduled row not yet loaded) ────────────────
  if (isAIMode && scheduledId && !aiContent) {
    return (
      <div style={{ height: '100dvh', background: WP.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: WP.dim, fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  // ─── AI MODE: full workout player ────────────────────────────────────────
  if (isAIMode) {
    const aiWorkoutMeta: AIWorkoutMeta = {
      title: aiContent?.title ?? 'Workout',
      duration_minutes: aiContent?.estimated_duration_minutes ?? 30,
      calories_burned: aiContent?.estimated_calories ?? 0,
      description: aiContent?.description,
    }

    if (showCompleted) {
      const workoutDurationMin = Math.floor(totalElapsed / 60)
      const completionStats = [
        { label: 'Duration', value: workoutDurationMin, unit: 'min' },
        { label: 'Calories', value: calories, unit: 'kcal' },
        { label: 'Exercises', value: exercises.length },
      ]
      return (
        <CompletionSummary
          activityTitle={aiWorkoutMeta.title}
          activityType="workout"
          stats={completionStats}
          pointsEarned={pointsEarned}
          onDone={() => navigate("/workout-schedule")}
        />
      )
    }

    return (
      <div style={{ height: '100dvh', background: WP.bg, position: 'relative', overflow: 'hidden' }}>

        {view === 'ready' && (
          <ReadyScreen
            workout={aiWorkoutMeta}
            exercises={exercises}
            onStart={startWorkout}
            onBack={() => navigate(-1)}
            primaryWearable={primaryWearable}
            onLaunchAppleWatch={launchOnAppleWatch}
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

        {view === 'playlist' && (
          <PlaylistSheet
            exercises={exercises} idx={idx}
            onJump={jumpTo}
            onClose={() => setView(prevView.current)}
          />
        )}
      </div>
    )
  }

  // ─── MODE C: freeform sport timer (unchanged) ────────────────────────────

  const displayTitle = activityType
  const SportIconComp = sport?.icon

  const hrZone = elapsed < 300 ? "Warm Up" : elapsed < 1200 ? "Fat Burn" : elapsed < 2400 ? "Cardio" : "Peak"
  const hrColor = elapsed < 300 ? "text-blue-400" : elapsed < 1200 ? "text-green-400" : elapsed < 2400 ? "text-orange-400" : "text-red-400"

  if (showCompleted) {
    const completionStats = [
      { label: "Duration", value: formatTime(elapsed) },
      { label: "Calories", value: calories, unit: "kcal" },
      ...(counter > 0 ? [{ label: counterLabel, value: counter }] : []),
    ]
    return (
      <CompletionSummary
        activityTitle={displayTitle}
        activityType={activityType.toLowerCase()}
        stats={completionStats}
        pointsEarned={pointsEarned}
        onDone={() => navigate("/workout-schedule")}
      />
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <IconComp className={cn("w-4 h-4", sport.color)} />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground truncate max-w-[180px]">
            {displayTitle}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Heart rate zone indicator */}
      <div className="flex justify-center z-10">
        <div className="flex items-center gap-2 bg-muted/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-border/30">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", hrColor.replace("text-", "bg-"))} />
          <span className={cn("text-xs font-medium", hrColor)}>{hrZone} Zone</span>
        </div>
      </div>

      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-mono font-bold tracking-tight text-foreground",
            elapsed >= 3600 ? "text-6xl" : "text-7xl",
            isPaused && "text-muted-foreground"
          )}>
            {formatTime(elapsed)}
          </span>
          {isPaused && (
            <span className="text-sm text-muted-foreground mt-1 animate-pulse">Paused</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <IconComp className={cn("w-3.5 h-3.5", sport.color)} />
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{counterLabel}</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-mono">{counter}</span>
          </div>
          <div className="h-10 w-px bg-border/30" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Calories</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-mono">{calories}</span>
          </div>
        </div>

        {/* Counter buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => { setCounter(s => Math.max(0, s - 1)); if (settings.autoVibrate) navigator.vibrate?.(20) }}
          >
            <Minus className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground w-20 text-center">Log {counterLabel.slice(0, -1)}</span>
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full border-primary/50 text-primary"
            onClick={() => { setCounter(s => s + 1); if (settings.autoVibrate) navigator.vibrate?.(50); toast.success(`${counterLabel.slice(0, -1)} ${counter + 1} logged!`) }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom controls — pause then full-width Finish (Triathlon-style tap) */}
      <div className="pb-10 pt-6 px-6 bg-card/95 backdrop-blur-xl rounded-t-[28px] border-t border-border/20 z-10">
        <div className="flex items-center justify-center pb-4">
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full transition-transform active:scale-90 border-2"
            onClick={togglePause}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>
        </div>

        <button
          onClick={finishActivity}
          className={cn(
            "w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px]",
            "flex items-center justify-center gap-2 touch-manipulation",
            "active:scale-[0.99] transition-transform",
            "shadow-lg shadow-primary/30"
          )}
        >
          <Flag className="w-[18px] h-[18px]" strokeWidth={2.4} />
          Finish session
        </button>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom">
          <SheetHeader><SheetTitle>Timer Settings</SheetTitle></SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span>Vibration Feedback</span>
              <Switch checked={settings.autoVibrate} onCheckedChange={c => setSettings(p => ({ ...p, autoVibrate: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <span>Show Calories</span>
              <Switch checked={settings.showCalories} onCheckedChange={c => setSettings(p => ({ ...p, showCalories: c }))} />
            </div>
          </div>
          <Button className="w-full" onClick={() => setShowSettings(false)}>Done</Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default GymTimer
