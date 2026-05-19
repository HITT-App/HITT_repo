import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, ChevronRight, Dumbbell } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

type ScheduledWorkout = {
  id: string
  scheduled_date: string
  workout: { id: string; title: string; duration_minutes: number }
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
        .select('id, scheduled_date, workout:workouts(id, title, duration_minutes)')
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

  // State C — no upcoming workouts
  if (items.length === 0) {
    return (
      <div className="mx-4 mt-4 mb-2">
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Schedule</span>
          </div>
          <p className="font-semibold text-foreground text-sm">No activities scheduled</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Let HIIT AI Coach build you a plan
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis'))}
            className="text-sm font-semibold text-primary active:opacity-70 transition-opacity"
          >
            Build my plan →
          </button>
        </div>
      </div>
    )
  }

  // State A (2–3 items) or State B (1 item)
  return (
    <div className="mx-4 mt-4 mb-2">
      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Next up</span>
          </div>
          <button
            onClick={() => navigate('/workout-schedule')}
            className="text-xs font-medium text-primary active:opacity-70 transition-opacity flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/workout/${item.workout.id}`)}
              className="w-full flex items-center gap-3 py-2 active:opacity-70 transition-opacity text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{item.workout.title}</p>
                <p className="text-xs text-muted-foreground">
                  {getDayLabel(item.scheduled_date)} · {item.workout.duration_minutes}min
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
        {items.length === 1 && (
          <button
            onClick={() => navigate('/workout-schedule')}
            className="mt-3 pt-3 border-t border-border/40 w-full text-xs text-muted-foreground text-left active:opacity-70 transition-opacity"
          >
            Plan the rest of your week →
          </button>
        )}
      </div>
    </div>
  )
}
