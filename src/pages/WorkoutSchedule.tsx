import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'

import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock,
  Plus, Dumbbell, Play, MoreHorizontal, Trash2, CalendarDays,
  Layers, Moon, Check,
} from 'lucide-react'
import {
  format, startOfWeek, addDays, isSameDay, parseISO,
  startOfMonth, endOfMonth, addMonths, getDaysInMonth, getDay,
  isToday, startOfDay,
} from 'date-fns'

type ScheduledWorkout = {
  id: string
  workout_id: string | null
  workout_source: string
  workout_title: string | null
  estimated_duration_minutes: number | null
  scheduled_date: string
  scheduled_time: string | null
  status: string
  workout: {
    id: string
    title: string
    duration_minutes: number
    category: string
    thumbnail_url: string | null
  } | null
}

function workoutColor(w: ScheduledWorkout): string {
  const text = ((w.workout?.category || '') + ' ' + (w.workout_title || w.workout?.title || '')).toLowerCase()
  if (text.includes('strength') || text.includes('weight')) return '#8b5cf6'
  if (/cardio|run|cycl|zone.?2|swim/.test(text)) return '#0ea5e9'
  if (/recovery|mobility|yoga|stretch|pilates/.test(text)) return '#10b981'
  return '#f97316'
}

export default function WorkoutSchedule() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  // Edit state
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkout | null>(null)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  useEffect(() => {
    if (user) fetchScheduledWorkouts()
  }, [user, currentDate, view])

  // Real-time subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('schedule_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'scheduled_workouts',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchScheduledWorkouts() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchScheduledWorkouts = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      let rangeStart: string, rangeEnd: string
      if (view === 'week') {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
        rangeStart = format(ws, 'yyyy-MM-dd')
        rangeEnd = format(addDays(ws, 6), 'yyyy-MM-dd')
      } else {
        rangeStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
        rangeEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      }

      const { data, error } = await supabase
        .from('scheduled_workouts')
        .select(`
          id,
          workout_id,
          workout_source,
          workout_title,
          estimated_duration_minutes,
          scheduled_date,
          scheduled_time,
          status,
          workout:workouts (
            id,
            title,
            duration_minutes,
            category,
            thumbnail_url
          )
        `)
        .eq('user_id', user.id)
        .gte('scheduled_date', rangeStart)
        .lte('scheduled_date', rangeEnd)
        .order('scheduled_date')
        .order('scheduled_time')

      if (error) throw error
      setScheduledWorkouts((data as unknown as ScheduledWorkout[]) || [])
    } catch (error) {
      console.error('Error fetching scheduled workouts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteScheduledWorkout = async (id: string) => {
    try {
      const { error } = await supabase.from('scheduled_workouts').delete().eq('id', id)
      if (error) throw error
      setScheduledWorkouts(prev => prev.filter(w => w.id !== id))
      toast({ title: 'Workout removed from schedule' })
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove workout' })
    }
  }

  const openActions = (workout: ScheduledWorkout, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedWorkoutId(null)
    setActiveWorkout(workout)
    setShowDayPicker(false)
    setShowActionSheet(true)
  }

  const moveWorkout = async (newDate: Date) => {
    if (!activeWorkout) return
    setIsMoving(true)
    try {
      const dateStr = newDate.toISOString().split('T')[0]
      const { error } = await supabase
        .from('scheduled_workouts')
        .update({ scheduled_date: dateStr })
        .eq('id', activeWorkout.id)
      if (error) throw error
      setScheduledWorkouts(prev =>
        prev.map(w => w.id === activeWorkout.id ? { ...w, scheduled_date: dateStr } : w)
      )
      toast({ title: 'Moved', description: `Workout moved to ${format(newDate, 'EEE d MMM')}` })
      setShowActionSheet(false)
    } catch {
      toast({ variant: 'destructive', title: 'Could not move workout' })
    } finally {
      setIsMoving(false)
    }
  }

  const navigatePeriod = (dir: 'prev' | 'next') => {
    if (view === 'week') {
      setCurrentDate(prev => addDays(prev, dir === 'next' ? 7 : -7))
    } else {
      setCurrentDate(prev => addMonths(prev, dir === 'next' ? 1 : -1))
      setSelectedDay(null)
    }
  }

  const getWorkoutsForDate = (date: Date) =>
    scheduledWorkouts.filter(w => isSameDay(parseISO(w.scheduled_date), date))

  // Monday-first week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Month calendar helpers
  const monthStart = startOfMonth(currentDate)
  const firstDayOffset = (getDay(monthStart) + 6) % 7 // 0=Mon … 6=Sun
  const totalDays = getDaysInMonth(currentDate)
  const calendarCells = Array.from(
    { length: firstDayOffset + totalDays },
    (_, i) => i < firstDayOffset ? null : addDays(monthStart, i - firstDayOffset)
  )
  // Compress row height for 5- and 6-week months so the selected-day panel
  // stays visible without scrolling.
  const calendarWeeks = Math.ceil((firstDayOffset + totalDays) / 7)
  const cellAspectRatio =
    calendarWeeks >= 6 ? '1/0.78' :
    calendarWeeks >= 5 ? '1/0.90' : '1/1.08'

  // Next-up workout (first upcoming, not completed)
  const today = startOfDay(new Date())
  const upcomingWorkouts = scheduledWorkouts
    .filter(w => parseISO(w.scheduled_date) >= today && w.status !== 'completed')
    .sort((a, b) => {
      const d = a.scheduled_date.localeCompare(b.scheduled_date)
      return d !== 0 ? d : (a.scheduled_time || '').localeCompare(b.scheduled_time || '')
    })
  const nextUp = upcomingWorkouts[0] ?? null

  // When label for the hero
  const heroWhen = nextUp
    ? isToday(parseISO(nextUp.scheduled_date)) ? 'Today'
      : isSameDay(parseISO(nextUp.scheduled_date), addDays(today, 1)) ? 'Tomorrow'
      : format(parseISO(nextUp.scheduled_date), 'EEEE')
    : ''

  // Start workout helper
  const startWorkout = (workout: ScheduledWorkout) => {
    if (workout.workout_source === 'ai_generated') {
      navigate(`/gym-timer?scheduled_id=${workout.id}`)
    } else if (workout.workout_id) {
      navigate(`/workout-player/${workout.workout_id}`)
    }
  }

  // Rail: days after nextUp's date to end of week, with their workouts
  const railDays = nextUp
    ? weekDays
        .filter(d => d > parseISO(nextUp.scheduled_date))
        .map(d => ({ day: d, workouts: getWorkoutsForDate(d) }))
    : []

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 px-3">
          <p className="font-mono text-[11px] font-bold tracking-widest uppercase text-primary">
            {view === 'week' ? 'Up next' : format(currentDate, 'MMMM yyyy')}
          </p>
          <h1 className="text-[30px] font-black tracking-tight text-foreground mt-1 leading-none">Schedule</h1>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "I'd like to add a workout to my schedule" } }))}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}
        >
          <Plus className="w-4.5 h-4.5 text-primary" style={{ color: '#f97316' }} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
      {/* Week strip — always shown */}
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13.5px] font-bold text-foreground">{format(weekDays[0], 'MMMM yyyy')}</span>
          <button
            onClick={() => setView(view === 'week' ? 'month' : 'week')}
            className="flex items-center gap-1.5 text-primary text-[12.5px] font-semibold"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            {view === 'week' ? 'Month' : 'Week'}
          </button>
        </div>
        <div className="flex gap-1.5">
          {weekDays.map((day, i) => {
            const sel = isSameDay(day, currentDate)
            const todayDay = isToday(day)
            const dayWorkouts = getWorkoutsForDate(day)
            return (
              <button
                key={i}
                onClick={() => setCurrentDate(day)}
                className="flex-1 rounded-[14px] py-2 pb-1.5 flex flex-col items-center gap-1.5 transition-colors"
                style={{
                  background: sel ? 'linear-gradient(160deg, #FFA84B, #f97316)' : 'hsl(var(--card))',
                  border: `1px solid ${sel ? 'transparent' : todayDay ? 'rgba(249,115,22,0.4)' : 'hsl(var(--border))'}`,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: sel ? 'rgba(26,10,0,0.7)' : todayDay ? '#f97316' : 'hsl(var(--muted-foreground))' }}>
                  {format(day, 'EEE')[0]}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: sel ? '#1a0a00' : 'hsl(var(--foreground))' }}>
                  {format(day, 'd')}
                </span>
                <div className="flex gap-1 h-1.5 items-center">
                  {dayWorkouts.length > 0
                    ? dayWorkouts.slice(0, 2).map((w, j) => (
                        <span key={j} style={{ width: 5, height: 5, borderRadius: 999, background: sel ? '#1a0a00' : workoutColor(w) }} />
                      ))
                    : <span style={{ width: 5, height: 5 }} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="px-5 space-y-3.5 overflow-y-auto">
          {nextUp ? (
            <>
              {/* Hero */}
              <div style={{
                position: 'relative', borderRadius: 22, padding: 20, overflow: 'hidden',
                background: 'linear-gradient(150deg,#FFA84B 0%,#f97316 55%,#e5751a 100%)',
                boxShadow: '0 18px 40px -14px rgba(249,115,22,0.6)',
              }}>
                <div style={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: 999, background: 'rgba(255,255,255,0.16)' }} />
                <div style={{ position: 'relative' }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '3px 8px', borderRadius: 999, color: '#1a0a00', background: 'rgba(26,10,0,0.18)',
                  }}>
                    {heroWhen}{nextUp.scheduled_time ? ` · ${nextUp.scheduled_time}` : ''}
                  </span>
                  <h2 style={{ margin: '14px 0 0', fontSize: 27, fontWeight: 800, color: '#1a0a00', letterSpacing: '-0.5px', lineHeight: 1.05 }}>
                    {nextUp.workout_title ?? nextUp.workout?.title ?? 'Workout'}
                  </h2>
                  <div style={{ display: 'flex', gap: 16, margin: '12px 0 16px', color: 'rgba(26,10,0,0.72)', fontSize: 13, fontWeight: 600 }}>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" style={{ color: '#1a0a00' }} />
                      {(nextUp.estimated_duration_minutes ?? nextUp.workout?.duration_minutes) ?? '—'} min
                    </span>
                    {nextUp.workout?.category && (
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" style={{ color: '#1a0a00' }} />
                        <span className="capitalize">{nextUp.workout.category}</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => startWorkout(nextUp)}
                    style={{
                      width: '100%', background: '#1a0a00', color: '#fff', borderRadius: 14, padding: '13px 0',
                      fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    <Play className="w-4 h-4 fill-white" style={{ color: '#fff' }} /> Start workout
                  </button>
                </div>
              </div>

              {/* Rest of week rail */}
              {railDays.length > 0 && (
                <div>
                  <p className="text-[12px] font-bold text-muted-foreground tracking-[0.04em] uppercase mb-3">Rest of your week</p>
                  <div className="relative">
                    <div className="absolute left-3.5 top-5 bottom-3 w-0.5 bg-border" />
                    {railDays.map(({ day, workouts }, i) => {
                      const isRest = workouts.length === 0
                      return (
                        <div key={i} className="flex gap-3.5 pb-3.5 relative">
                          <div style={{
                            width: 28, height: 28, borderRadius: 999, flexShrink: 0, zIndex: 1,
                            background: isRest ? 'transparent' : 'hsl(var(--background))',
                            border: `2px solid hsl(var(--border))`,
                            display: 'grid', placeItems: 'center',
                          }}>
                            {isRest
                              ? <Moon className="w-3 h-3 text-muted-foreground" />
                              : <span style={{ width: 8, height: 8, borderRadius: 999, background: 'hsl(var(--muted-foreground))' }} />}
                          </div>
                          <div
                            className="flex-1 rounded-[14px] border border-border px-3.5 py-2.5 flex items-center gap-2.5"
                            style={{ opacity: isRest ? 0.65 : 1 }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[10.5px] font-bold text-muted-foreground tracking-[0.05em] uppercase">{format(day, 'EEE')}</p>
                              <p className="text-[14.5px] font-bold text-foreground mt-0.5">
                                {isRest ? 'Rest day' : (workouts[0].workout_title ?? workouts[0].workout?.title ?? 'Workout')}
                              </p>
                            </div>
                            {!isRest && workouts[0].scheduled_time && (
                              <span className="text-[12px] text-muted-foreground font-mono">{workouts[0].scheduled_time}</span>
                            )}
                            {!isRest && (
                              <button onClick={(e) => openActions(workouts[0], e)} className="p-1 text-muted-foreground/40">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center text-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                <Dumbbell className="w-9 h-9 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xl font-bold">Nothing scheduled yet.</p>
                <p className="text-muted-foreground text-sm mt-1">Ask Jarvis to build you a plan.</p>
              </div>
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: "Can you suggest a workout for me to schedule?" } }))}
                className="gap-2"
              >
                Ask Jarvis
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="px-4 pb-32">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              onClick={() => navigatePeriod('prev')}
              className="w-8 h-8 rounded-[10px] bg-card border border-border flex items-center justify-center"
            >
              <ChevronLeft className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
            <span className="text-[15px] font-bold text-foreground">{format(currentDate, 'MMMM')}</span>
            <button
              onClick={() => navigatePeriod('next')}
              className="w-8 h-8 rounded-[10px] bg-card border border-border flex items-center justify-center"
            >
              <ChevronRight className="w-4.5 h-4.5 text-muted-foreground" />
            </button>
          </div>
          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10.5px] font-bold text-muted-foreground/60 tracking-[0.04em] py-1">{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarCells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const dayWorkouts = getWorkoutsForDate(day)
              const todayDay = isToday(day)
              const sel = selectedDay ? isSameDay(day, selectedDay) : false
              const dots = dayWorkouts.slice(0, 3).map(w => workoutColor(w))
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)}
                  className="flex flex-col items-center"
                  style={{ aspectRatio: cellAspectRatio, justifyContent: 'center', gap: 5 }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center',
                    background: todayDay ? 'linear-gradient(160deg,#FFA84B,#f97316)' : sel ? 'hsl(var(--primary))' : 'transparent',
                    fontSize: 14, fontWeight: todayDay || sel ? 800 : 600,
                    color: todayDay ? '#1a0a00' : sel ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                  }}>
                    {format(day, 'd')}
                  </div>
                  <div className="flex gap-1 h-1.5 items-center">
                    {dots.map((c, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: 999, background: c }} />)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          <div className="mt-4">
            {selectedDay ? (
              <>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[12px] font-bold text-primary tracking-[0.04em] uppercase whitespace-nowrap">
                    {format(selectedDay, 'EEEE d')}{isToday(selectedDay) ? ' · Today' : ''}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('hitt:open-jarvis', { detail: { prefillMessage: `I'd like to add a workout for ${format(selectedDay, 'EEEE d MMMM')}` } }))}
                    className="text-[12px] font-semibold text-primary"
                  >
                    Add
                  </button>
                </div>
                {getWorkoutsForDate(selectedDay).length > 0
                  ? getWorkoutsForDate(selectedDay).map(w => (
                      <div key={w.id} className="flex items-center gap-3 p-3 rounded-[16px] bg-card border border-border mb-2">
                        <div style={{ width: 44, height: 44, borderRadius: 13, background: `${workoutColor(w)}1f`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Dumbbell style={{ color: workoutColor(w) }} className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-foreground truncate">{w.workout_title ?? w.workout?.title}</p>
                          <p className="text-[12.5px] text-muted-foreground">
                            {w.scheduled_time ?? ''}{w.scheduled_time ? ' · ' : ''}{(w.estimated_duration_minutes ?? w.workout?.duration_minutes) ?? '—'} min
                          </p>
                        </div>
                        {w.status === 'completed' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        <button onClick={(e) => openActions(w, e)} className="p-1 text-muted-foreground/40">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  : <p className="text-sm text-muted-foreground py-2">No workouts scheduled</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Tap a day to see workouts</p>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Action sheet — Move or Delete */}
      <Sheet open={showActionSheet} onOpenChange={setShowActionSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          {activeWorkout && (
            <div className="pt-2">
              <p className="font-semibold text-base mb-1 px-1">{activeWorkout.workout_title ?? activeWorkout.workout?.title}</p>
              <p className="text-xs text-muted-foreground px-1 mb-5">
                {format(parseISO(activeWorkout.scheduled_date), 'EEEE d MMMM')}
              </p>
              {!showDayPicker ? (
                <div className="space-y-2">
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:bg-secondary transition-colors text-left"
                    onClick={() => {
                      if (activeWorkout.workout_source === 'ai_generated') {
                        navigate(`/gym-timer?scheduled_id=${activeWorkout.id}`)
                      } else if (activeWorkout.workout_id) {
                        navigate(`/workout-player/${activeWorkout.workout_id}`)
                      }
                    }}
                  >
                    <Play className="w-5 h-5 text-primary" />
                    <span className="font-medium">Start now</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 active:bg-secondary transition-colors text-left"
                    onClick={() => setShowDayPicker(true)}
                  >
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <span className="font-medium">Move to a different day</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-destructive/10 active:bg-destructive/20 transition-colors text-left"
                    onClick={() => { deleteScheduledWorkout(activeWorkout.id); setShowActionSheet(false) }}
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <span className="font-medium text-destructive">Remove from schedule</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setShowDayPicker(false)} className="p-1">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <p className="text-sm font-medium">Choose a new day</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                    {Array.from({ length: 28 }, (_, i) => addDays(new Date(), i + 1)).map(date => (
                      <button
                        key={date.toISOString()}
                        disabled={isMoving}
                        onClick={() => moveWorkout(date)}
                        className={[
                          'flex flex-col items-center py-3 rounded-2xl border-2 transition-all text-center',
                          isSameDay(date, parseISO(activeWorkout.scheduled_date))
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-secondary/30',
                        ].join(' ')}
                      >
                        <span className="text-xs text-muted-foreground">{format(date, 'EEE')}</span>
                        <span className="text-sm font-bold">{format(date, 'd')}</span>
                        <span className="text-[10px] text-muted-foreground">{format(date, 'MMM')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
