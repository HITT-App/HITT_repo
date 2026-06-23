import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Clock, Flame, Dumbbell, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { ExerciseSnapshot } from '@/hooks/useAI.types'
import { format } from 'date-fns'

type Props = {
  title: string
  description: string
  exercises_snapshot: ExerciseSnapshot[]
  estimated_duration_minutes: number
  estimated_calories: number
  onDismiss: () => void
  onScheduled?: (date: string, title: string) => void
}

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  // Local-day string — feeds an HTML date picker and a scheduled_date write,
  // both of which the user expects to be "their" tomorrow, not UTC's.
  return format(d, 'yyyy-MM-dd')
}

export function AIWorkoutCard({
  title,
  description,
  exercises_snapshot,
  estimated_duration_minutes,
  estimated_calories,
  onDismiss,
  onScheduled,
}: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showExercises, setShowExercises] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(tomorrow())
  const [isScheduling, setIsScheduling] = useState(false)
  const [addedDate, setAddedDate] = useState<string | null>(null)

  const handleDoNow = () => {
    navigate('/gym-timer', {
      state: {
        aiWorkout: {
          title,
          description,
          exercises_snapshot,
          estimated_duration_minutes,
          estimated_calories,
        },
      },
    })
  }

  const handleAddToSchedule = async () => {
    if (!user) return
    setIsScheduling(true)
    try {
      const { error } = await supabase.from('scheduled_workouts').insert({
        user_id: user.id,
        workout_id: null,
        workout_source: 'ai_generated',
        workout_title: title,
        workout_description: description,
        exercises_snapshot,
        estimated_duration_minutes,
        estimated_calories,
        scheduled_date: selectedDate,
        status: 'scheduled',
      })
      if (error) throw error
      const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
      setAddedDate(displayDate)
      onScheduled?.(selectedDate, title)
    } catch (err) {
      console.error('[AIWorkoutCard] schedule error:', err)
      toast.error('Failed to add to schedule')
      setIsScheduling(false)
    }
  }

  // Optimistic success state — card shows confirmation
  if (addedDate) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground">Added to schedule · {addedDate}</p>
        </div>
        <Button size="sm" variant="ghost" className="text-xs h-8 text-muted-foreground shrink-0" onClick={onDismiss}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Dumbbell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">AI Workout</span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
          <Clock className="w-3 h-3" />{estimated_duration_minutes} min
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
          <Flame className="w-3 h-3" />{estimated_calories} kcal
        </span>
        <span className="text-xs text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1">
          {exercises_snapshot.length} exercises
        </span>
      </div>

      {/* Collapsible exercise list */}
      <button
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShowExercises(v => !v)}
      >
        <span>{showExercises ? 'Hide exercises' : 'Show exercises'}</span>
        {showExercises ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showExercises && (
        <div className="space-y-1.5 pb-1">
          {exercises_snapshot.map(ex => (
            <div key={ex.order_index} className="flex items-start gap-2">
              <span className="text-[10px] text-muted-foreground mt-0.5 w-4 shrink-0">{ex.order_index}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{ex.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {ex.sets && ex.reps
                    ? `${ex.sets}×${ex.reps}`
                    : ex.duration_seconds
                    ? `${ex.duration_seconds}s`
                    : ''}
                  {ex.body_area ? ` · ${ex.body_area.replace('_', ' ')}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date picker (shown when "Add to schedule" tapped) */}
      {showDatePicker && !addedDate && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="date"
            value={selectedDate}
            min={tomorrow()}
            onChange={e => setSelectedDate(e.target.value)}
            className="flex-1 text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            size="sm"
            className="text-xs h-8 bg-primary text-primary-foreground"
            disabled={isScheduling}
            onClick={handleAddToSchedule}
          >
            {isScheduling ? 'Adding…' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-8"
            onClick={() => setShowDatePicker(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Action buttons */}
      {!showDatePicker && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-primary text-primary-foreground text-xs h-9"
            onClick={handleDoNow}
          >
            Do now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9"
            onClick={() => setShowDatePicker(true)}
          >
            Add to schedule
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
      )}
    </div>
  )
}
