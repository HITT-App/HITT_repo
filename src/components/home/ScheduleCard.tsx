import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
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

function DayBadge({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr + 'T00:00:00')
  const dateNum = d.getDate()
  const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
  return (
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
      <span className="text-[15px] font-bold text-primary leading-none">{dateNum}</span>
      <span className="text-[9px] font-semibold text-primary/70 leading-tight">{dayName}</span>
    </div>
  )
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

  if (items.length === 0) {
    return (
      <div className="mx-5 mt-[22px] mb-2">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-bold text-foreground">Schedule</h2>
        </div>
        <div className="bg-card border border-border/60 rounded-[18px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
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

  return (
    <div className="mx-5 mt-[22px] mb-2">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-base font-bold text-foreground">Next up</h2>
        <button
          onClick={() => navigate('/workout-schedule')}
          className="text-sm font-medium text-primary active:opacity-70 transition-opacity flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="bg-card border border-border/60 rounded-[18px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/workout/${item.workout.id}`)}
              className="w-full flex items-center gap-3 py-2 active:opacity-70 transition-opacity text-left"
            >
              <DayBadge dateStr={item.scheduled_date} />
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
