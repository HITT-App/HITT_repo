import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, CalendarDays, Dumbbell } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

type ScheduledWorkout = {
  id: string
  scheduled_date: string
  workout_source: string
  workout_title: string | null
  estimated_duration_minutes: number | null
  workout: { id: string; title: string; duration_minutes: number } | null
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(dateStr: string) {
  if (dateStr === todayStr()) return "Today"
  if (dateStr === tomorrowStr()) return "Tomorrow"
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
}

export function ScheduleCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState<ScheduledWorkout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const load = async () => {
      const { data } = await supabase
        .from('scheduled_workouts')
        .select('id, scheduled_date, workout_source, workout_title, estimated_duration_minutes, workout:workouts(id, title, duration_minutes)')
        .eq('user_id', user.id)
        .gte('scheduled_date', todayStr())
        .order('scheduled_date', { ascending: true })
        .limit(3)
      setItems((data as unknown as ScheduledWorkout[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return null

  if (items.length === 0) {
    return (
      <div className="mx-5 mt-[22px] mb-2">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-bold text-foreground">Next up</h2>
        </div>
        {/* Empty hero card */}
        <div style={{ borderRadius: 18, padding: 20, background: 'linear-gradient(180deg, rgba(249,115,22,0.10), rgba(249,115,22,0.03))', border: '1px solid rgba(249,115,22,0.22)' }}>
          {/* Calendar chip */}
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <CalendarDays size={24} color="#f97316" strokeWidth={1.8} />
          </div>
          <p style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>No sessions scheduled</p>
          <p style={{ fontSize: 12.5, color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: 244, marginBottom: 18 }}>Let your AI coach build a week around your goals, fitness level, and free time.</p>
          {/* AI CTA */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis'))}
            style={{ width: '100%', height: 44, borderRadius: 12, background: '#f97316', border: 'none', color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, WebkitTapHighlightColor: 'transparent' }}
          >
            ✦ Plan my week with AI
          </button>
          <button
            onClick={() => navigate('/workout-schedule')}
            style={{ width: '100%', background: 'none', border: 'none', fontSize: 12.5, fontWeight: 600, color: 'var(--muted-foreground)', cursor: 'pointer', padding: '4px 0', WebkitTapHighlightColor: 'transparent' }}
          >
            Add a session manually
          </button>
        </div>
      </div>
    )
  }

  const item = items[0]
  const title = item.workout?.title ?? item.workout_title ?? 'Workout'
  const duration = item.workout?.duration_minutes ?? item.estimated_duration_minutes
  const handleTap = () => item.workout_source === 'ai_generated'
    ? navigate(`/gym-timer?scheduled_id=${item.id}`)
    : navigate(`/workout/${item.workout?.id}`)

  return (
    <div className="mx-5 mt-[22px] mb-2">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base font-bold text-foreground">Next up</h2>
        <button onClick={() => navigate('/workout-schedule')} className="text-sm font-medium text-primary active:opacity-70 transition-opacity flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      {/* Hero card */}
      <div style={{ position: 'relative', borderRadius: 18, padding: 16, overflow: 'hidden', background: 'linear-gradient(180deg, rgba(249,115,22,0.12), rgba(249,115,22,0.02))', border: '1px solid rgba(249,115,22,0.30)' }}>
        {/* glow blob */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 999, background: 'rgba(249,115,22,0.12)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        {/* Top row: sport chip + eyebrow + day pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={18} color="#f97316" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#f97316', marginBottom: 2 }}>Next up</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1.1 }}>{title}</div>
          </div>
          <div style={{ flexShrink: 0, background: 'rgba(249,115,22,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#f97316' }}>
            {getDayLabel(items[0].scheduled_date)}
          </div>
        </div>
        {/* Meta */}
        {duration && (
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)', marginBottom: 14 }}>
            {duration} min
          </div>
        )}
        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleTap}
            style={{ flex: 1, height: 42, borderRadius: 12, background: '#f97316', border: 'none', color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, WebkitTapHighlightColor: 'transparent' }}
          >
            ▶ Start
          </button>
          <button
            onClick={() => navigate(`/workout-schedule?reschedule=${item.id}`)}
            style={{ flex: 1, height: 42, borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--foreground)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
          >
            Reschedule
          </button>
        </div>
      </div>
    </div>
  )
}
