import { useState } from 'react'
import { Calendar, Clock, Flame, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { WorkoutInPlan } from '@/hooks/useAI.types'

type Props = {
  title: string
  goal: string
  start_date: string
  workouts: WorkoutInPlan[]
  onDismiss: () => void
  onScheduled?: (count: number) => void
}

function formatDisplayDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function AIWorkoutPlanCard({ title, goal, start_date, workouts, onDismiss, onScheduled }: Props) {
  const { user } = useAuth()
  const [isAdding, setIsAdding] = useState(false)
  const [addedCount, setAddedCount] = useState<number | null>(null)

  const handleAddAll = async () => {
    if (!user) return
    setIsAdding(true)
    try {
      const rows = workouts.map(w => ({
        user_id: user.id,
        workout_id: null,
        workout_source: 'ai_generated',
        workout_title: w.title,
        workout_description: w.description,
        exercises_snapshot: w.exercises,
        estimated_duration_minutes: w.estimated_duration_minutes,
        estimated_calories: w.estimated_calories,
        scheduled_date: w.scheduled_date,
        status: 'scheduled',
      }))

      // Single insert — all rows or none (bulk insert rolls back on any constraint failure)
      const { error } = await supabase.from('scheduled_workouts').insert(rows)
      if (error) throw error

      setAddedCount(rows.length)
      onScheduled?.(rows.length)
    } catch (err) {
      console.error('[AIWorkoutPlanCard] schedule error:', err)
      toast.error('Failed to add plan to schedule — please try again')
      setIsAdding(false)
    }
  }

  // Success state
  if (addedCount !== null) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-4 space-y-2">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            <p className="text-xs text-muted-foreground">{addedCount} workouts added to your schedule</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs h-8 text-muted-foreground shrink-0" onClick={onDismiss}>
            Done
          </Button>
        </div>
        <div className="space-y-1 pl-8">
          {workouts.map(w => (
            <p key={w.scheduled_date} className="text-xs text-muted-foreground">
              {formatDisplayDate(w.scheduled_date)} — {w.title}
            </p>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">AI Plan · {workouts.length} workouts</span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{goal}</p>
        </div>
      </div>

      {/* Workout list */}
      <div className="space-y-2">
        {workouts.map(w => (
          <div key={w.scheduled_date} className="flex items-center gap-3 bg-background/50 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{w.title}</p>
              <p className="text-[10px] text-muted-foreground">{formatDisplayDate(w.scheduled_date)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />{w.estimated_duration_minutes}m
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Flame className="w-3 h-3" />{w.estimated_calories}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-primary text-primary-foreground text-xs h-9"
          disabled={isAdding}
          onClick={handleAddAll}
        >
          {isAdding ? 'Adding…' : 'Add all to schedule'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-9 text-muted-foreground"
          onClick={onDismiss}
        >
          Skip
        </Button>
      </div>
    </div>
  )
}
